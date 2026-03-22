# Analyse de Performance — Formel

Pourquoi l'application ralentit quand le nombre de donnees augmente.

---

## 1. Probleme N+1 dans `getSummary()` — CRITIQUE

**Fichier:** `backend/src/modules/finance/finance.service.js` (lignes 94-112)

```js
for (const e of enrollmentData) {
  const [{ paid }] = await db.select({ paid: sum(payments.amount) })
    .from(payments)
    .where(and(
      eq(payments.enrollmentId, e.enrollmentId),
      eq(payments.status, 'completed'),
    ));

  const [{ pending }] = await db.select({ pending: sum(payments.amount) })
    .from(payments)
    .where(and(
      eq(payments.enrollmentId, e.enrollmentId),
      eq(payments.status, 'pending'),
    ));
}
```

**Le probleme:** Pour chaque inscription, on execute **2 requetes SQL sequentielles**. Avec 300 eleves, ca fait **600 requetes SQL** a chaque appel. Avec 1000 eleves, ca fait **2000 requetes**.

**Complexite:** O(n) requetes ou n = nombre d'inscriptions.

**Solution:** Remplacer par une seule requete avec `GROUP BY`:

```sql
SELECT enrollment_id, status, SUM(amount) as total
FROM payments
WHERE enrollment_id IN (...)
GROUP BY enrollment_id, status
```

---

## 2. Chargement total de la table `scholarships` — CRITIQUE

**Fichier:** `backend/src/modules/finance/finance.service.js` (lignes 74 et 173)

```js
const allScholarships = await db.select().from(scholarships);
```

**Le probleme:** Cette ligne charge **TOUTES** les bourses de la base de donnees en memoire, sans filtre. Si on a 300 eleves avec 2 bourses chacun, ca charge 600 enregistrements. Avec 3000 eleves, ca charge 6000+ enregistrements. Elle est appelee a **2 endroits differents** dans le meme fichier.

**Complexite:** O(total_scholarships) en memoire a chaque appel.

**Solution:** Filtrer par les enrollment IDs pertinents:

```js
const allScholarships = await db.select().from(scholarships)
  .where(inArray(scholarships.enrollmentId, enrollmentIds));
```

---

## 3. Probleme N+1 dans `getVersementFinance()` — CRITIQUE

**Fichier:** `backend/src/modules/finance/finance.service.js` (lignes 196-222)

```js
for (const e of enrollmentData) {
  // ... calculs scholarships ...
  const [{ nonBookPaid }] = await db.select(...)
    .from(payments)
    .where(and(
      eq(payments.enrollmentId, e.enrollmentId),
      eq(payments.status, 'completed'),
      eq(payments.isBookPayment, false),
    ));
  // ... boucle interne sur versements ...
}
```

**Le probleme:** Pour chaque inscription, une requete SQL individuelle. Puis pour chaque inscription, une boucle sur tous les versements. Ca donne O(n) requetes SQL + O(n * v) operations en memoire.

---

## 4. Dashboard: Requetes en cascade — ELEVE

**Fichier:** `backend/src/modules/finance/finance.service.js` (lignes 232-331)

`getDashboardStats()` execute **6+ requetes SQL sequentielles** a chaque chargement du dashboard:

1. Requete pour l'annee scolaire active
2. `COUNT` des inscriptions
3. `COUNT` des classes
4. `SUM` des paiements du mois
5. `SELECT` des versements pour verifier les retards (+ filtre en JavaScript)
6. `SELECT` des paiements recents (avec 4 JOINs)
7. `SELECT` des echeances a venir

**En plus**, le dashboard fait appel a `useFinanceSummary()` pour **chaque groupe de classes** via le composant `RevenueGroupBar`. Si on a 4 groupes, ca declenche 4 appels supplementaires a `getSummary()` — qui a son tour a le probleme N+1 decrit au point 1.

**Impact total sur le dashboard:** 6 + (4 groupes x (1 + 2n)) requetes. Avec 300 eleves: ~2400+ requetes juste pour afficher le dashboard.

---

## 5. Index manquants sur les cles etrangeres — CRITIQUE

PostgreSQL ne cree **PAS** automatiquement d'index sur les colonnes de cles etrangeres. Seule la cle primaire est automatiquement indexee. Chaque `WHERE` ou `JOIN` sur ces colonnes fait un **scan complet de la table**.

| Table | Colonne sans index | Utilisation |
|-------|-------------------|-------------|
| `contacts` | `student_id` | Chargement des contacts d'un eleve |
| `student_documents` | `student_id` | Chargement des documents d'un eleve |
| `payment_documents` | `payment_id` | Chargement des justificatifs |
| `scholarships` | `enrollment_id` | Calcul des bourses (appele partout) |
| `scholarships` | `target_versement_id` | Re-mapping des bourses |
| `audit_logs` | `user_id` | Filtrage des logs |
| `audit_logs` | `created_at` | Tri chronologique |

**Tables qui ont des index (bien):** `enrollments` (student_id, class_id, school_year_id), `payments` (enrollment_id), `versements` (class_group_id, school_year_id).

**Impact:** Avec 300 eleves et ~600 bourses, chaque `WHERE scholarships.enrollment_id = ?` scanne les 600 lignes au lieu de trouver directement les 2 pertinentes. Ce probleme **empire lineairement** avec le nombre d'enregistrements.

---

## 6. Index manquants sur les colonnes de filtre — MOYEN

**Fichier:** `backend/src/db/schema/students.js`

La table `students` n'a **aucun index** alors qu'on filtre regulierement sur:

- `status` (filtre "Inscrit/Transfere/Expulse/Diplome")
- `scholarship_recipient` (filtre "Boursiers/Non boursiers")
- `first_name` / `last_name` (recherche par nom avec `ILIKE`)

Le `ILIKE` ne peut pas utiliser un index B-tree standard. Pour le rendre performant, il faudrait un **index trigram** (`pg_trgm`).

---

## 7. Insertions sequentielles dans une boucle — MOYEN

**Fichier:** `backend/src/modules/fees/fees.service.js` (lignes 87-101, 153-167)

```js
for (const v of data.versements) {
  const [created] = await tx.insert(versements).values({...}).returning();
  versementRecords.push(created);
}
```

**Le probleme:** Chaque versement est insere par un `INSERT` individuel au lieu d'un batch insert. Avec 3 versements c'est tolerable, mais le pattern est dangereux s'il est copie ailleurs.

**Solution:** Utiliser `tx.insert(versements).values([...allValues]).returning()`.

---

## 8. Meme remappage de bourses avec requetes individuelles — MOYEN

**Fichier:** `backend/src/modules/students/students.service.js` (lignes 244-263)

```js
for (const annul of annulations) {
  // ... par annulation, un UPDATE ou DELETE individuel ...
  await db.update(scholarships).set({...}).where(eq(scholarships.id, annul.id));
}
```

Chaque annulation fait un `UPDATE` ou `DELETE` separe. Pas critique car le nombre de bourses par eleve est petit (2-5), mais ce pattern serait problematique dans un contexte batch (promotion de masse).

---

## 9. Calcul des versements en retard fait en JavaScript — MOYEN

**Fichier:** `backend/src/modules/finance/finance.service.js` (lignes 276-283)

```js
const overdueList = await db
  .select({ id: versements.id })
  .from(versements)
  .where(and(
    eq(versements.schoolYearId, activeYear.id),
    gte(versements.dueDate, '2000-01-01'),
  ));
const overdueVersements = overdueList.filter((v) => v.dueDate < today).length;
```

**Le probleme:** On charge **tous** les versements et on filtre en JavaScript avec `.filter()`. La condition `gte(versements.dueDate, '2000-01-01')` est inutile — elle matche tout. Le filtre devrait etre fait en SQL avec `lte(versements.dueDate, today)`.

---

## 10. Aucun `staleTime` configure sur les queries React — MOYEN

**Fichier:** `frontend/src/hooks/use-finance.ts`, `frontend/src/hooks/use-students.ts`

**Aucune** query React n'a de `staleTime` defini. Par defaut, React Query considere les donnees comme perimees **immediatement**. Chaque navigation vers une page deja visitee re-declenche toutes les requetes API.

```ts
// Actuel — refetch a chaque visite
export function useDashboardStats() {
  return useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: getDashboardStats,
  });
}
```

**Impact:** Navigation entre Dashboard → Eleves → Dashboard = 2 chargements complets du dashboard. Avec le probleme N+1, ca multiplie les requetes inutiles.

---

## 11. Invalidation trop large des caches React — MOYEN

**Fichier:** `frontend/src/hooks/use-students.ts` (lignes 268-271)

```ts
// Apres creation d'une bourse
queryClient.invalidateQueries({ queryKey: ['students'] });
queryClient.invalidateQueries({ queryKey: ['enrollments'] });
```

**Le probleme:** Invalider `['students']` supprime **tout** le cache des eleves — la liste paginee, tous les details individuels, toutes les balances. Meme chose pour `['enrollments']`. Une seule modification de bourse declenche le rechargement de dizaines de requetes.

**Solution:** Invalider de maniere chirurgicale:

```ts
queryClient.invalidateQueries({ queryKey: ['enrollments', enrollmentId, 'scholarships'] });
queryClient.invalidateQueries({ queryKey: ['students', 'detail', studentId] });
```

---

## 12. Cle de query incorrecte — BUG

**Fichier:** `frontend/src/hooks/use-students.ts` (ligne 226 vs ligne 182)

```ts
// Hook balance (ligne 182)
queryKey: ['students', studentId, 'balance']

// Invalidation apres promotion (ligne 226)
queryClient.invalidateQueries({ queryKey: ['students', 'balance', id] });
```

Les cles ne matchent pas (`studentId, 'balance'` vs `'balance', id`). L'invalidation apres une promotion **ne fonctionne pas**. L'utilisateur voit des donnees obsoletes jusqu'au prochain rafraichissement.

---

## 13. Page detail: 4+ appels API paralleles non optimises — MOYEN

**Fichier:** `frontend/src/pages/StudentDetailPage.tsx`

Chaque visite d'un eleve declenche au minimum:

1. `useStudent(id)` — GET `/students/:id`
2. `useStudentBalance(id)` — GET `/students/:id/balance`
3. `usePayments(enrollmentId)` — GET `/enrollments/:id/payments`
4. `useScholarships(enrollmentId)` — GET `/enrollments/:id/scholarships`

Le endpoint `/students/:id` charge deja l'inscription courante. Le balance, les paiements et les bourses pourraient etre inclus dans la meme reponse pour eviter 3 allers-retours reseau supplementaires.

---

## 14. Audit logs sans index et croissance illimitee — FAIBLE

**Fichier:** `backend/src/db/schema/auditLogs.js`

- Aucun index sur `user_id`, `table_name`, ou `created_at`
- Aucune politique de retention — la table grandit indefiniment
- Chaque creation, modification, ou suppression ajoute 1-2 lignes

Avec une utilisation active, cette table grossit de milliers de lignes par mois. Sans index, toute requete de filtrage ou de recherche scannera la totalite.

---

## Resume: Impact par nombre d'eleves

| Eleves | Requetes SQL par chargement Dashboard | Requetes SQL par `getSummary()` |
|--------|--------------------------------------|-------------------------------|
| 50     | ~400                                  | ~100                          |
| 300    | ~2400                                 | ~600                          |
| 1000   | ~8000                                 | ~2000                         |
| 3000   | ~24000                                | ~6000                         |

## Priorite de correction

| # | Probleme | Severite | Effort |
|---|---------|----------|--------|
| 1 | N+1 dans `getSummary()` | CRITIQUE | 2h |
| 2 | `SELECT * FROM scholarships` sans filtre | CRITIQUE | 30min |
| 3 | N+1 dans `getVersementFinance()` | CRITIQUE | 2h |
| 5 | Index manquants sur FK | CRITIQUE | 30min |
| 4 | Dashboard requetes en cascade | ELEVE | 3h |
| 6 | Index sur colonnes de filtre | MOYEN | 30min |
| 10 | Pas de `staleTime` React | MOYEN | 15min |
| 11 | Invalidation cache trop large | MOYEN | 30min |
| 12 | Cle de query incorrecte (bug) | BUG | 5min |
| 13 | Page detail multi-appels | MOYEN | 2h |
| 7 | Insertions en boucle | FAIBLE | 15min |
| 9 | Filtre overdue en JS | FAIBLE | 10min |
| 14 | Audit logs sans index | FAIBLE | 15min |
