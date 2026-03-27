// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);

  // Solve Captcha
  cy.get('.bg-gray-900\\/50.px-3.py-2.rounded-lg span')
    .invoke('text')
    .then((text) => {
      // Text format is: "5 + 3 = ?" or "8 - 2 = ?"
      const match = text.match(/(\d+)\s+([\+\-])\s+(\d+)\s+=\s+\?/);
      if (match) {
        const num1 = parseInt(match[1]);
        const operator = match[2];
        const num2 = parseInt(match[3]);
        const answer = operator === '+' ? num1 + num2 : num1 - num2;
        
        cy.get('input[placeholder="Respuesta"]').type(answer.toString());
        cy.get('button[type="submit"]').click();
      } else {
        throw new Error('Could not parse captcha: ' + text);
      }
    });

  // Verify login success
  cy.url().should('not.include', '/login');
  cy.contains('Bienvenido').should('be.visible');
});
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })