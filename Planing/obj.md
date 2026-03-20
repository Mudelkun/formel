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


