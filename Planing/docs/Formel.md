# Formel



School Attendance \& Fee Tracking App



This is a private school management system designed to track student attendance, tuition payments, and academic records. The application acts as a digital student dossier, centralizing all administrative and academic information in one secure platform.



Main Features

&#x20;

1\. **Admin Account Setup** 

&#x09;⦁ Admin creates and configures the institution profile (name, address, academic year, contact info) 

&#x09;⦁ Admin defines the number of grades/classes and their names 

&#x09;⦁ Admin sets tuition fees for each grade 

&#x09;⦁ Admin configures payment types (yearly, per semester, custom plans)



2\. **Student Management** 

&#x09;⦁ Admin can add students to the system 

&#x09;⦁ Admin can search students by name 

&#x09;⦁ Admin can filter students by grade 

&#x09;⦁ Admin can edit student information at any time

&#x09;(Students are never deleted, they are marked as transfer)



3\. **Tuition \& Payments** 

&#x09;⦁ Admin can view a complete tuition payment history for each student

&#x09;⦁ The secretary is responsible for updating payment records 

&#x09;⦁ Proof of payment (receipt/document) must be uploaded for each transaction



4\. **Student Dossier** 

&#x09;⦁ While creating a student profile, the administrator or the secreatry can upload required documents 	

&#x09;⦁ Additional documents can be uploaded later and stored in the student dossier 

&#x09;⦁ Each student can have a profile picture displayed in the admin interface



5\. **Scholarships** 

&#x09;⦁ Students can be marked as scholarship recipients 

&#x09;⦁ Scholarship students are exempt from partial or full tuition payments



6\. **Academic Progress** 

&#x20;       ⦁ The administrator set the start and end date for a school year (can be more specific with semester as well)

&#x09;⦁ Student grades are automatically updated at the start of a new school year using the administrator's data

&#x09;⦁ If a student must repeat a grade, the administrator can manually downgrade the student manualy 



7\. **Financial Overview** 

&#x09;⦁ Administrator's dashboard will show insignt about payments (revenu init: type(totalOfPaymentHistory), revenu out: type(revenu left to be collected from the substraction of revenue init and total grade tiution multiplie by number of student in that grade for each grades)) 

&#x09;⦁ Administrator can calculate revenue for a specific grade/class (revenue init:, revenu out:)



8\. **Payment Reminders \& Alerts** 

&#x09;⦁ Administrator can configure automatic payment reminder emails (send payment alerts to parents email for a student)

&#x09;⦁ When a payment due date is passed, students with missing payments are highlighted in red



9\. **Attendance Tracking** 





10\. **Security \& Permissions (rolebase access)**



&#x09;⦁ **Admin account**

&#x09;- Admin create grades

&#x09;- Admin set grades payment amount for full school year

&#x09;- Admin can see financial report

&#x09;- Admin can configure payments type

&#x09;- Admin can see all audit log





&#x09;⦁ **Secretary accounts** are limited to: 

&#x09;- creating students and updating students

&#x09;- Updating tuition payment history 

&#x09;- Uploading proof of payment documents



&#x09;⦁ **Teachers accounts** are limited to:	

&#x09;**-** 

