describe('Ganar Module Tests', () => {
  const email = 'usuarioadmin@gmail.com';
  const password = 'Manizales02*';

  beforeEach(() => {
    cy.login(email, password);
  });

  it('should load the Ganar page and show guests list', () => {
    cy.visit('/ganar');
    cy.contains('Ganar').should('be.visible');
    cy.contains('Registro y seguimiento de invitados').should('be.visible');
    
    // Check if GuestList loads
    cy.contains('Lista de Invitados').should('be.visible');
  });

  it('should open the Guest Registration Form', () => {
    cy.visit('/ganar');
    
    // Clicking "Registrar Nuevo Invitado"
    cy.contains('Registrar Nuevo Invitado').click();
    
    // Verify modal is open
    cy.contains('Nuevo Invitado').should('be.visible');
    cy.get('input[name="fullName"]').should('be.visible');
    
    // Close modal
    cy.contains('Cancelar Registro').click();
    cy.contains('Nuevo Invitado').should('not.exist');
  });

  it('should navigate to statistics tab', () => {
    cy.visit('/ganar');
    cy.contains('Estadísticas').click();
    cy.contains(/Estadísticas de Invitados|Cargando/);
  });
});
