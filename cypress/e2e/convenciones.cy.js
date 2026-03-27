describe('Convenciones Module Tests', () => {
  const email = 'usuarioadmin@gmail.com';
  const password = 'Manizales02*';

  beforeEach(() => {
    cy.login(email, password);
  });

  it('should load the Convenciones page and show the list and stats', () => {
    cy.visit('/convenciones');
    cy.contains('Convenciones').should('be.visible');
    cy.contains('Seguimiento de Convenciones anuales').should('be.visible');
    
    // Check if the create button is visible for admin
    cy.contains('Nueva Convención').should('be.visible');
  });

  it('should toggle between table and card view in Convenciones', () => {
    cy.visit('/convenciones');
    
    // Switch to Cards View (use the squares four icon)
    cy.get('button[title="Vista de tarjetas"]').click();
    
    // Switch to Table View (use the list icon)
    cy.get('button[title="Vista de tabla"]').click();
  });

  it('should open and close the "Nueva Convención" modal', () => {
    cy.visit('/convenciones');
    
    cy.contains('Nueva Convención').click();
    cy.contains('Nueva Convención').should('be.visible');
    cy.contains('Lema / Tema').should('be.visible');
    
    cy.contains('Cancelar').click();
    cy.contains('Lema / Tema').should('not.exist');
  });
});
