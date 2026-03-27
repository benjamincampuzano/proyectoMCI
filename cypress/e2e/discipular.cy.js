describe('Discipular Module Tests', () => {
  const email = 'usuarioadmin@gmail.com';
  const password = 'Manizales02*';

  beforeEach(() => {
    cy.login(email, password);
  });

  it('should load the Discipular page and show the classes management', () => {
    cy.visit('/discipular');
    cy.contains('Capacitación Destino').should('be.visible');
    cy.contains('Escuela de Liderazgo').should('be.visible');
    
    // Check if CourseManagement (default tab) loads
    cy.contains('Clases y Notas').should('be.visible');
  });

  it('should navigate through Discipular tabs', () => {
    cy.visit('/discipular');
    
    // Click Student Matrix
    cy.contains('Matriz de Estudiantes').click();
    cy.contains(/Matriz de Estudiantes|Cargando/).should('exist');
    
    // Click Statistical Report
    cy.contains('Reporte Estadístico').click();
    cy.contains(/Reporte Estadístico|Cargando/).should('exist');
  });
});
