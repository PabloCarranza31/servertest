const express = require('express');
const router = express.Router();
const users = require('../models/usuarios');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const fs = require('fs');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');
const auth = require('../middleware/auth'); // Importa el middleware de autenticación

dotenv.config();

// Obtener todos los usuarios
router.get('/', (req, res) => {
  users.find()
    .then((data) => res.json(data))
    .catch((error) => res.json({ message: error }));
});


// Ruta de Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
  
    try {
      // Buscar usuario por email
      const user = await users.findOne({ email });
      
      if (!user || user.password !== password) {
        
        return res.status(400).json({ message: 'Email o contraseña incorrectos' });
      }
  
      // Crear y enviar token JWT
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: '1h',
      });
  
      res.json({ token , user});
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
    
  });


// Crear un nuevo usuario 
router.post('/registro', async (req, res) => {
  const { email, nombre,telefono,password } = req.body;

  try {
    // Verificar si el usuario ya existe
    const existingUser = await users.findOne({ email });
    
    if (existingUser) {
      return res.status(400).json({ message: 'El correo electrónico ya está en uso' });
    }

    // Crear el nuevo usuario
    const newUser = new users({ email, nombre,telefono,password  });
    const savedUser = await newUser.save();

    res.status(201).json(savedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



// Actualizar un usuario por ID
router.put('/:id',auth, (req, res) => {
    const userId = req.params.id;
  
    users.findByIdAndUpdate(userId, req.body, { new: true })
      .then(updatedUser => res.json(updatedUser))
      .catch(error => res.status(400).json({ message: error.message }));
  });
  
  // Eliminar un usuario por ID
  router.delete('/:id',auth, (req, res) => {
    const userId = req.params.id;
  
    users.findByIdAndDelete(userId)
      .then(() => res.json({ message: 'Usuario eliminado correctamente' }))
      .catch(error => res.status(400).json({ message: error.message }));
  });


  //encriptado
  const caesarCipher = (str, shift) => {
    return str.split('').map(char => {
      if (char.match(/[a-z]/i)) {
        const code = char.charCodeAt();
        let base = code >= 65 && code <= 90 ? 65 : 97;
        return String.fromCharCode(((code - base + shift) % 26) + base);
      }
      return char;
    }).join('');
  };


const client = new MongoClient(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
// Backup
router.post('/backup', async (req, res) => {
  try {
      await client.connect();
      const database = client.db('safeHealmet');
      const collections = await database.collections();

      let backupData = {};
      for (let collection of collections) {
          const collectionName = collection.collectionName;
          const data = await collection.find({}).toArray();
          backupData[collectionName] = data;
      }

      // Convertir datos de respaldo a un buffer
      const backupBuffer = Buffer.from(JSON.stringify(backupData, null, 2));

      // Configurar encabezados para la descarga
      res.setHeader('Content-disposition', 'attachment; filename=backup.json');
      res.setHeader('Content-type', 'application/json');

      // Enviar el archivo como respuesta
      res.send(backupBuffer);
  } catch (error) {
      console.error(error);
      res.status(500).send('Error creating backup');
  } finally {
      await client.close();
  }
});

  
  const caesarDecipher = (str, shift) => {
    return caesarCipher(str, 26 - shift);
  };

  // Solicitar restablecimiento de contraseña
router.post('/request-reset', async (req, res) => {
  const { email } = req.body;
 const emailCipher =caesarCipher(email,3) 

  try {
    const user = await users.findOne({ email:emailCipher });
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    console.log()
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await user.save();

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      to: email,
      from: process.env.EMAIL,
      subject: 'Recuperación de Contraseña',
      text: `Estás recibiendo esto porque tú (o alguien más) ha solicitado el restablecimiento de la contraseña para tu cuenta.\n\n
        Haz clic en el siguiente enlace, o pégalo en tu navegador para completar el proceso:\n\n
        http://localhost:3000/reset/${token}\n\n
        Si no solicitaste esto, ignora este correo y tu contraseña permanecerá sin cambios.\n`,
    };

    transporter.sendMail(mailOptions, (err, response) => {
      if (err) {
        console.error('No se pudo enviar el correo', err);
        return res.status(500).send('Error al enviar el correo');
      }
      res.status(200).send('Correo de recuperación enviado');
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Restablecer contraseña
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
console.log(req.params,password)
  try {
    const user = await users.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).send('Contraseña actualizada con éxito');
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
