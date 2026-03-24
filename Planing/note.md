# students

## when creating a student

When creating a student The modal should also include aptional field for contact information about the student and also be able to upload his document.
We curenly just get basic information only. Even tho those information are not required in orther to create the student, we should still ask for them to encaurage the user to do it now.

### When updating students

we should alwas ensure that we can edit any information about a student after creation

### for scholarship

There is a current "Eleve boursier" check mark when creating a student.

- This is a reminder of how scholarship works
(for the scholarships - acctually a student can have many types of scholarships -- a scholarship can be partial or a fixed amount --- the scholarship can also be a annulation of a versement or book payment: its like setting a fixe scholarship amount that instenly goes toward a given versement or the book payment.)

we need to add these as fields to when the check box is check to specify the scolarship of the student. If the scholarship chek box is cheked it is required that we spicify the scolarship amount or if it is full school year or if it is for book only, or if it is for versement but not books.


### for school years when creating a student

we should always ensure that the school year dropdown is set to the current active school year NOT EDITABLE.


## new feauture for students

 - A payment history section

This section should show the history of recorded payment for this student for the selected year by the user.

 - A promote button

This button should move the student's grade from the current to the next available grade by overwriting incription or deleting current incription and recreating a new one..

 - A downgrade button

This button is use when a student repeat a grade. If we promoted it befor using the autopromotion button, we wold want to click that button to make tem move one step down in the grade tree.


### bug to fix

Right now when we promote a student from one grade to another the Eleves page shows duplicate students -- we should change that and show the student that are enrolled
Since a student cannot exist without an enrolement. If we switch to a diffrent year but there wasn't any students enroled for that year, than it should be blank unless we promot previous year's student first.

--

Right now frontend does not take students with scholarship into consideration when showing the late payment flag. Even if student has a 100% scholarship, the frontend still show late payment flag. Please fix this.


## potential issue

 - if an institution start its enrolement mid year

What if we start adding new student for next year while the active year is the current year.
Well if we switch to new school year And promote all students, all of  These new students will be moved one grade up and we will have to downgrade them later. This can be a pain.
We should add a new feauture when creating a student -- "Enrolle for next year only"
This should ensure that a school year higher than the current year exist and when we switch to that year and promote all students, these students will be enrolled already enrolled for that year so we would skip them all.

## Permission Fixes

- When creating a student, users with a **secretary account** should not be able to assign a scholarship.  
  Currently, this restriction is enforced after the student is created, but not during creation.

- Secretary accounts should not be allowed to send messages to a student’s contact.

- Secretary accounts should be able to **add and delete student documents**.  
  At the moment, they can only upload a single document.

- The following information should be hidden from secretary accounts on the main dashboard:
  - Paiements ce mois  
  - Évolution des paiements  
  - Aperçu des recettes  

---

## Logic Fix

- Students who cannot be promoted due to the absence of a next class should be marked as **graduated**, rather than being ignored.

---

## Frontend Fix

- On the **"Années scolaires"** page, switching between years causes the UI elements to shift unexpectedly.  
  This behavior is confusing because the change is not clearly visible, and it may lead users to click the wrong buttons.


## bug to fix

- scholatshp does not follow year rule. Student with no scholarship for a previous year appear as scholarship with the tag when they did have a scholarship for next year. 