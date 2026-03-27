describe('Encuentros Module Tests', () => {
  const email = 'usuarioadmin@gmail.com';
  const password = 'Manizales02*';

  beforeEach(() => {
    cy.login(email, password);
  });

  it('should load the Encuentros page and show the list and stats', () => {
    cy.visit('/encuentros');
    cy.contains('Encuentros').should('be.visible');
    cy.contains('Gestión de Encuentros').should('be.visible');
    
    // Check if the create button is visible for admin
    cy.contains('Nuevo Encuentro').should('be.visible');
  });

  it('should toggle between table and card view', () => {
    cy.visit('/encuentros');
    
    // Switch to Cards View (use the squares four icon)
    cy.get('button[title="Vista de tarjetas"]').click();
    
    // Switch to Table View (use the list icon)
    cy.get('button[title="Vista de tabla"]').click();
  });

  it('should open and close the "Nuevo Encuentro" modal', () => {
    cy.visit('/encuentros');
    
    cy.contains('Nuevo Encuentro').click();
    cy.contains('Nuevo Encuentro').should('be.visible');
    cy.contains('Palabra Rhema').should('be.visible');
    
    cy.contains('Cancelar').click();
    cy.contains('Palabra Rhema').should('not.exist');
  });
});
