describe('Authentication Tests', () => {
  const solveCaptcha = () => {
    return cy.get('.bg-gray-900\\/50.px-3.py-2.rounded-lg span')
      .invoke('text')
      .then((text) => {
        // Text format is: "5 + 3 = ?" or "8 - 2 = ?"
        const match = text.match(/(\d+)\s+([\+\-])\s+(\d+)\s+=\s+\?/);
        if (match) {
          const num1 = parseInt(match[1]);
          const operator = match[2];
          const num2 = parseInt(match[3]);
          return operator === '+' ? num1 + num2 : num1 - num2;
        }
        throw new Error('Could not parse captcha: ' + text);
      });
  };

  it('should attempt login with invalid credentials and show error', () => {
    cy.visit('/login');

    cy.get('input[type="email"]').type('invalid@user.com');
    cy.get('input[type="password"]').type('wrongpassword');

    solveCaptcha().then((answer) => {
      cy.get('input[placeholder="Respuesta"]').type(answer.toString());
      cy.get('button[type="submit"]').click();
    });

    // Check for error message
    cy.get('.bg-red-500\\/10').should('be.visible')
      .and('contain', 'Usuario no encontrado');
  });

  it('should show error with wrong captcha', () => {
    cy.visit('/login');

    cy.get('input[type="email"]').type('test@user.com');
    cy.get('input[type="password"]').type('password');

    // Enter wrong captcha
    cy.get('input[placeholder="Respuesta"]').type('999');
    cy.get('button[type="submit"]').click();

    // Check for captcha specific error
    cy.contains('Captcha incorrecto').should('be.visible');
  });
});
