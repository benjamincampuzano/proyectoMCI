describe('Smoke Test - Proyecto Iglesia', () => {
  it('should load the login page and show the welcome message', () => {
    cy.visit('/login');
    
    // Check for the logo or main headers
    cy.get('img[alt="MCI Logo"]').should('be.visible');
    cy.contains('Bienvenido').should('be.visible');
    cy.contains('Ingresa a tu cuenta').should('be.visible');
    
    // Check for essential form elements
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('contain', 'Iniciar Sesion');
  });

  it('should show the captcha verification block', () => {
    cy.visit('/login');
    cy.contains('Verificación de Seguridad').should('be.visible');
    cy.get('input[placeholder="Respuesta"]').should('be.visible');
  });
});
