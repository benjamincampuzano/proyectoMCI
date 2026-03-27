describe('Home Module Tests', () => {
  const email = 'usuarioadmin@gmail.com';
  const password = 'Manizales02*';

  beforeEach(() => {
    cy.login(email, password);
  });

  it('should load the dashboard and show the welcome message', () => {
    cy.visit('/');
    cy.contains('Dashboard Principal').should('be.visible');
    cy.contains(`Bienvenido,`).should('be.visible');
  });

  it('should navigate through tabs in Home', () => {
    cy.visit('/');
    
    // Check Red de Personas (default)
    cy.contains('Red de Personas').should('be.visible');
    
    // Click Actividad y Ministerio
    cy.contains('Actividad y Ministerio').click();
    cy.url().should('include', '/');
    
    // Click Informe General
    cy.contains('Informe General').click();
    cy.contains('Cargando Estadísticas...').should('exist');
  });
});
