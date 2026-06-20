const mongoose = require('mongoose');

/**
 * Etablit la connexion a la base MongoDB en utilisant l'URI defini
 * dans les variables d'environnement (MONGO_URI).
 *
 * Si la connexion echoue, le processus est arrete : il est inutile
 * de demarrer une API qui ne peut pas parler a sa base de donnees.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connecte : ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`Erreur de connexion MongoDB : ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
