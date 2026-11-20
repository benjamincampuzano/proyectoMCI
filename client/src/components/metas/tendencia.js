/**
 * Línea de tendencia por mínimos cuadrados sobre `punto.total`.
 *
 * Recibe [{ fecha, total, ... }] y devuelve los mismos puntos con un campo
 * `tendencia`: la recta y = a + b·x ajustada a los totales, donde x es el
 * índice del punto (0, 1, 2, …). Si hay menos de dos puntos, la tendencia
 * coincide con el total (no hay recta que dibujar).
 *
 * Es la misma fórmula que usa el gráfico de Ganados.
 */
const agregarTendencia = (puntos) => {
    if (puntos.length < 2) {
        return puntos.map((punto) => ({ ...punto, tendencia: punto.total }));
    }

    const n = puntos.length;
    const sumaX = (n * (n - 1)) / 2;
    const sumaY = puntos.reduce((suma, punto) => suma + punto.total, 0);
    const sumaXY = puntos.reduce((suma, punto, i) => suma + i * punto.total, 0);
    const sumaX2 = puntos.reduce((suma, _punto, i) => suma + i * i, 0);

    const pendiente = (n * sumaXY - sumaX * sumaY) / (n * sumaX2 - sumaX * sumaX);
    const intercepto = (sumaY - pendiente * sumaX) / n;

    // Nunca por debajo de cero: no existe asistencia negativa.
    return puntos.map((punto, i) => ({
        ...punto,
        tendencia: Math.max(0, intercepto + pendiente * i)
    }));
};

export default agregarTendencia;
