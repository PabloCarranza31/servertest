const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  // Verifica si existe el encabezado 'Authorization'
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'Falta el encabezado de Authorization' });
  }

  try {
    // Verifica y decodifica el token JWT
    const token = authHeader.replace('Bearer ', ''); // Remueve 'Bearer ' del encabezado
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Almacena el userId decodificado en req para uso posterior
    req.userId = decoded.userId;
    
    // Llama al siguiente middleware
    next();
  } catch (error) {
    // Captura y maneja errores de verificación del token
    res.status(401).json({ message: 'Autorización no válida' });
  }
};

module.exports = auth;
