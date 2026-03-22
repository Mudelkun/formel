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

