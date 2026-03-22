today's objective are

 - imliment authentification routes.


 ## my prompt

 - A classs group is dividing a group of classs to give it a referal name
 example: PPS to MS (prescolaire), CP to CM2 (primaire), 6em to 3em (secondaire)

 There is a buisness logic in the app that we need to change. 
 
 So right now we have quaters and we are assuming that the tiution payement per quarter is equaly divided among the number of quaters in a school year. I talk about it to the institution that i'm acctually building this for, and this is not how their tiution acctually works. 
 
 Insted they set 3 payments in a year each with a specific amount, They call them "versement" in french. They have 3 per year for each class and they differ per class group(1).
 The total tiution year for the class is not equally divided among those 3 payment, acctually they have a book fee that is in the total year tiution so tiution = titutiontotalpayments + booksPayments, we need to find a way to impliment this in our code base while still future proofing advance financial analytic. A student can pay any amount, the amount a student pay is not limited to versement.

 The versement is like an amount due by a specific data, for example if we have first versement (2000) by janurary, second (4000) by march, third (2000) by the end of the school year. We need to be able to see in the system if a student as paid full versement by du date. When anyone record a payment in the system the person needs to have the oiption to select if the payment is for book specificly, because book and first versement can be required in other to have a good balance by versement due date. We should still calculate the total remaing balance for the student from the total tiution for the specific group meaning book payments + school year payments.

 We should never restric how much a student is able to pay. If a payment is not for book specific we should take it and divide it acros all versement to see which versement we are actualy up to for a specific student. We can always have fields with: amount remaning for current versement, amount remaning for books, amount remaing for school year.




 - lets start woking on the frontend,for now we will build the login page and connect it to the api. We will display a diffrent message for diffrent user role to validate that i authenticate as the right user. Folow FrontendTechStack.md and good-design.md for referal.


 - we will be implimenting the studnets management right now in the frontend -- refer to userflow in the planing/diagram to fetch information about how the student management acctually works ---- we need to configure everything there is to be configured for a student management only.

 ## note for the frontend

  - change the student's status from "Actif" to "inscrit" "inactif" to "transferer"

  - We need to be able to click on a student and see more details about that student and be avble to update ata about the student as well: uploading new documents and stuff like that

  - We need to had a curency field in settings page and in the database and use that to display currency in the frontend
  
  - since incription are push automaticly when we create a student, we do not need to be able to create one - this migh cause conflict with duplicating inscription for the same student.

  - Automatic grade promotion is handle by the frontend so we need to add a button for that with confirm modal

  - We need to be able to record a new payment by clicking a button like the create student button

  - We need a way to confirm secretary's recorded payment in the frontend

  - we need to be able to click on a payment and see more detail about the payment including its documents

  - We need a contact page to see studen'ts contact informmation and be able to send custom or premaid message to students 

  - Prof accounts should not have acces to "Tableau de bord"

  - Even when i talk in english the app should stay in french as it will make it easier to show things to the institution later on.

 - we need a grade column in the student page


Note for finance

for the scholarships - acctually a student can have many types of scholarships -- a scholarship can be partial or a fixed amount --- the scholarship can also be a annulation of a versement or book payment: its like setting a fixe scholarship amount that instenly goes toward a given versement or the book payment.

More notes

we need to impliment advanced student search queries in the search bar --- we should alwayz try to get what user types and try to find students based on that -- right now i can oly search by one word at a time --  i want to be able to search student by firstname and lastname at the same time


i need to be able to change the amount set for versement and book fee for class group of classe at any time - when i click the "configuerr button", the model should be pre populated with data that i had already set and i should be able to overwrite them when  click the mettre a joure button

## Thanks to claude

 - You are doing a grade job at styling the website modernly i'm impressed. Keep up with the good work.

## what claud has freedom to impliment

- financial analytic
- dashboard with noce disigning


# prompt2

Students
Creating a Student

When creating a student, the modal should include optional fields for additional contact information and the ability to upload documents.

Currently, only basic information is collected. Although these extra details are not required to create a student, they should still be requested to encourage users to provide them upfront.

Updating a Student

All student information should remain fully editable after creation. Users must be able to modify any field at any time.

Scholarship Management

There is currently an “Élève boursier” checkbox when creating a student.

Scholarship Logic
A student can have multiple types of scholarships.
A scholarship can be:
A partial amount
A fixed amount
A scholarship can also:
Cover tuition payments (versements)
Cover book payments
Act as a full waiver (annulation) for specific payments
Required Improvements

When the “Élève boursier” checkbox is selected, additional fields must appear to define the scholarship:

Scholarship type (partial, fixed, full)
Coverage:
Full school year
Books only
Tuition only (versements)
Amount (if applicable)

If the checkbox is selected, these fields become mandatory.

School Year (During Student Creation)

The school year dropdown should:

Automatically be set to the current active school year
Be non-editable
New Features
Payment History Section

Add a section that displays:

The history of all recorded payments
Filtered by the selected school year
Promote Button

This button should:

Move the student to the next grade level
Update enrollment by:
Either overwriting the current enrollment
Or deleting and recreating it for the new grade
Downgrade Button

This button is used when a student repeats a grade.

If a student was previously promoted, this allows moving them one level down in the grade structure.
Bug to Fix
Duplicate Students After Promotion

Currently, promoting a student creates duplicate entries on the “Élèves” page.

Expected Behavior
Only show students who are actively enrolled
A student cannot exist without an enrollment
When switching to a different school year:
If no students are enrolled, the list should be empty
Students should only appear after being promoted or enrolled for that year


---

# Scholarship Management

## Scholarship Type (Dropdown)


- Bourse complète (100%)
  - Covers all tuition payments and books
- Bourse scolarité
  - Covers all tuition payments only

- Bourse special
 - Annuler un ou plusieurs versements
 - Annuler tous les versements
 - Annuler le paiement des livres

## bug to fix

When we click annuler le paiment des livres the math is not done corecly in the student page.

## before confirming

Verify that all the math and calculations are correct in the student page

## Consistency

The "élève boursier" dialog in the student creation modal must be identical to the one used in the student page.

This should be implemented as a reusable component.


# Payments

## Payment Creation Modal

- **Auto-Confirm for Admin-Recorded Payments**: Do not automatically confirm payments recorded by admin. Instead, add an optional "Auto-confirm" checkbox. If unchecked, payments remain pending and can be confirmed manually later.

- **Advanced Student Search**: Implement search functionality in the student selection field modal when recording a payment. When the institution has many students, filtering should support multiple search criteria to make finding students easier.

- **Payment Method**: Add "Dépôt bancaire" as an available payment method option.

- **Document Upload & Preview**: 
  - Only allow PDF documents to be uploaded
  - Display a preview of the uploaded document
  - Always confirm the action before deleting a document

## Payment Status Management

- **Edit Payment Status**: Users should always be able to edit a payment's status at any time to correct mistakes or errors.

## Payments History Page

- **Advanced Filtering & Search**: Enable advanced filtering and searching across all payment history. Support filtering by:
  - Individual class
  - Group of classes
  - Other relevant criteria

- **Dashboard Components**: Ensure all dashboard components function correctly, including:
  - "Taux de recouvrement" (currently not working)
  - Any other analytics displays

## Known Issues & Bugs

- **Rejected Payment Status Bug**: In the student payment history, rejected payments incorrectly remain with an "En attente" (pending) status. Rejected payments should display a "Rejeté" (rejected) status in French.

--

# Editable Records After Creation

Several entities should remain fully editable after creation to accommodate institutional changes:

- **Class Group Name**: Allow editing of class group names (not just other properties)
- **Class Details**: Enable editing of:
  - Niveau (grade level)
  - Name
  - Class group assignment (move a class to a different group)

---

# Student Status Management

**Recommended Implementation based on your system:**

Since students are inherently linked to enrollments, and students cannot exist without an active enrollment, student status should be managed through the **enrollment record**, not the student master record itself.

## Status Definition & Lifecycle

**Status field location**: `enrollments.status` (not on the student record)

**Available statuses:**

1. **Inscrit (Enrolled)** — Default status
   - Student is actively enrolled in the current school year
   - Associated with payment obligations and class participation

2. **Transféré (Transferred)** — Status when student leaves the institution
   - Student has transferred to another school or institution
   - Records are retained for historical/financial tracking
   - No longer active for current year

3. **Inactif (Inactive)** — Status for students no longer attending
   - Student dropped out or left without transferring
   - Records retained for audit and financial history
   - No active payment obligations for this status

**note**: Make sure to take acount for that when calculating the total of student enrolled, the total of revenue needeed to be collected and everything that could potentially display wrong data to the user.

## Key Design Principles

- A student can have **different statuses across different school years** (enrolled in 2024-2025, transferred in 2025-2026)
- When changing school years, only display students with "Inscrit" status
- When filtering/viewing a specific school year, status determines visibility and payment obligations
- Status changes should be auditable (track who changed it and when)


---

# Financial Dashboard (Aperçu Financier)

## Data Display Improvements

- **Scholarship Total**: Display the total monetary amount of scholarships given instead of "Taux global" (global rate)
  - Show: Sum of all scholarship amounts awarded
  - Include breakdown by scholarship type if applicable

## Quality Assurance

- Verify all dashboard components function correctly with no calculation errors
- Test all calculations with edge cases (partial scholarships, multiple scholarships per student, etc.)

---

# Payment Tracking & Alerts

- **Late Payment Flag**: Flag students who have missing or unpaid versement amounts by their due date
  - Display on the student detail page
  - Use visual indicators (red flag, warning icon, etc.) to highlight overdue payments

- **Filter by Overdue Balance**: Add a filter option on the students list page to display only students with overdue/unpaid balance
  - Show students with outstanding versement payments past their due dates
  - Quick-access feature to identify students requiring follow-up or payment collection

