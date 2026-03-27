describe('Consolidar Module Tests', () => {
  const email = 'usuarioadmin@gmail.com';
  const password = 'Manizales02*';

  beforeEach(() => {
    cy.login(email, password);
  });

  it('should load the Consolidar page and show the tracking list', () => {
    cy.visit('/consolidar');
    cy.contains('Consolidar').should('be.visible');
    cy.contains(/Gestión de seguimiento|Seguimiento de Invitados/).should('be.visible');
  });

  it('should switch between Consolidar tabs', () => {
    cy.visit('/consolidar');
    
    // Check Tracking (Default)
    cy.contains('Seguimiento de Invitados').should('be.visible');
    
    // Click Attendance
    cy.contains('Asistencia a la Iglesia').click();
    cy.contains(/Registro de Asistencia|Cargando/).should('exist');
    
    // Click Stats
    cy.contains('Estadísticas de Asistencia').click();
    cy.contains(/Gráfico de Asistencia|Cargando/).should('exist');
  });
});
