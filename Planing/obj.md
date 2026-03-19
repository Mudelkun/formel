today's objective are

 - imliment authentification routes.


 my prompt

 1. A classs group is dividing a group of classs to give it a referal name
 example: PPS to MS (prescolaire), CP to CM2 (primaire), 6em to 3em (secondaire)

 There is a buisness logic in the app that we need to change. 
 
 So right now we have quaters and we are assuming that the tiution payement per quarter is equaly divided among the number of quaters in a school year. I talk about it to the institution that i'm acctually building this for, and this is not how their tiution acctually works. 
 
 Insted they set 3 payments in a year each with a specific amount, They call them "versement" in french. They have 3 per year for each class and they differ per class group(1).
 The total tiution year for the class is not equally divided among those 3 payment, acctually they have a book fee that is in the total year tiution so tiution = titutiontotalpayments + booksPayments, we need to find a way to impliment this in our code base while still future proofing advance financial analytic. A student can pay any amount, the amount a student pay is not limited to versement.

 The versement is like an amount due by a specific data, for example if we have first versement (2000) by janurary, second (4000) by march, third (2000) by the end of the school year. We need to be able to see in the system if a student as paid full versement by du date. When anyone record a payment in the system the person needs to have the oiption to select if the payment is for book specificly, because book and first versement can be required in other to have a good balance by versement due date. We should still calculate the total remaing balance for the student from the total tiution for the specific group meaning book payments + school year payments.

 We should never restric how much a student is able to pay. If a payment is not for book specific we should take it and divide it acros all versement to see which versement we are actualy up to for a specific student. We can always have fields with: amount remaning for current versement, amount remaning for books, amount remaing for school year.




 lets start woking on the frontend,for now we will build the login page and connect it to the api. We will display a diffrent message for diffrent user role to validate that i authenticate as the right user. Folow FrontendTechStack.md and good-design.md for referal.