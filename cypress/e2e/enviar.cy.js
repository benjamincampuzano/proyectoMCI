describe('Enviar Module Tests', () => {
  const email = 'usuarioadmin@gmail.com';
  const password = 'Manizales02*';

  beforeEach(() => {
    cy.login(email, password);
  });

  it('should load the Enviar page and show cell attendance', () => {
    cy.visit('/enviar');
    cy.contains('Enviar').should('be.visible');
    cy.contains('Gestión de asistencia a células').should('be.visible');
    
    // Check if CellAttendance (default tab) loads
    cy.contains('Asistencia').should('be.visible');
  });

  it('should switch between Enviar tabs', () => {
    cy.visit('/enviar');
    
    // Click Cells Management
    cy.contains('Células').click();
    cy.contains(/Gestión de Células|Cargando/).should('exist');
    
    // Click Statistics
    cy.contains('Estadísticas').click();
    cy.contains(/Estadísticas de Asistencia|Cargando/).should('exist');
  });
});
