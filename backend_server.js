/*
* ===============================================
* SERVEUR BACKEND POUR LA PLATEFORME VIDÉO ISC
* VRAIE BASE DE DONNÉES (POSTGRESQL)
* ===============================================
*/

import express from 'express';
import cors from 'cors';
import https from 'https';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg'; // Importe le pilote PostgreSQL

const { Pool } = pg;

// --- Connexion à la base de données ---
// Render fournit cette URL automatiquement via les Variables d'Environnement
const dbUrl = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: dbUrl,
    ssl: {
        rejectUnauthorized: false // Requis pour les connexions à Render
    }
});

// --- Initialisation de la base de données ---
// Crée la table "videos" si elle n'existe pas au démarrage
const initDb = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS videos (
                id SERIAL PRIMARY KEY,
                youtubeVideoId VARCHAR(20) NOT NULL,
                title VARCHAR(255) NOT NULL,
                uploader VARCHAR(255),
                keywords TEXT[],
                summary TEXT,
                adminAnnotation TEXT,
                viewCount INTEGER,
                createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Base de données initialisée (Table 'videos' vérifiée/créée).");
    } catch (err) {
        console.error("ERREUR lors de l'initialisation de la DB:", err.stack);
    }
};

const app = express();
const port = process.env.PORT || 3000;

// Pour servir les fichiers statiques (notre index.html)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Sers le frontend

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// ===============================================
// ROUTES DE L'API (Le "Moteur")
// ===============================================

// Route 1 : Obtenir toutes les vidéos
app.get('/api/videos', async (req, res) => {
    try {
        // Lit depuis la DB, en triant par la plus récente
        const result = await pool.query('SELECT * FROM videos ORDER BY createdAt DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la lecture de la base de données." });
    }
});

// Route 2 : Ajouter une nouvelle vidéo
app.post('/api/add-video', async (req, res) => {
    const { videoUrl, adminAnnotation } = req.body;
    
    // --- Extraction de l'ID ---
    let videoId = null;
    try {
        const url = new URL(videoUrl);
        if (url.hostname === 'youtu.be') videoId = url.pathname.slice(1);
        else if (url.hostname.includes('youtube.com')) videoId = url.searchParams.get('v');
    } catch (error) {
        return res.status(400).json({ message: "URL YouTube invalide." });
    }
    if (!videoId) return res.status(400).json({ message: "ID vidéo non trouvé." });

    // --- Simulation de l'analyse IA (pour l'instant) ---
    const simulatedData = {
        title: "Titre Simulé (en attente de l'API YT)",
        uploader: "Chaîne Simulée",
        keywords: ["Simulé", "IA", "Keyword 3", "Keyword 4", "Keyword 5"],
        summary: `Ceci est un résumé simulé généré par IA pour la vidéo ${videoId}.`,
        viewCount: 0
    };

    // --- Appel (futur) à l'API YouTube pour les vraies données ---
    if (YOUTUBE_API_KEY) {
        try {
            const ytApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics&key=${YOUTUBE_API_KEY}`;
            const response = await axios.get(ytApiUrl);
            const item = response.data.items[0];
            
            simulatedData.title = item.snippet.title;
            simulatedData.uploader = item.snippet.channelTitle;
            simulatedData.viewCount = parseInt(item.statistics.viewCount, 10);
        } catch (error) {
            console.error("Erreur lors de l'appel à l'API YouTube:", error.message);
        }
    }

    // --- Sauvegarde dans la VRAIE base de données ---
    try {
        const result = await pool.query(
            `INSERT INTO videos (youtubeVideoId, title, uploader, keywords, summary, adminAnnotation, viewCount)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                videoId,
                simulatedData.title,
                `${simulatedData.uploader} • ${simulatedData.viewCount ? (simulatedData.viewCount / 1000).toFixed(0) + 'K' : 'N/A'} vues`,
                simulatedData.keywords,
                simulatedData.summary,
                adminAnnotation,
                simulatedData.viewCount
            ]
        );
        
        // Renvoie la nouvelle vidéo (qui vient de la DB) au frontend
        res.status(201).json(result.rows[0]); 

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de l'écriture dans la base de données." });
    }
});

// Route 3 : Proxy pour les miniatures
app.get('/api/thumbnail', (req, res) => {
    const videoId = req.query.v;
    if (!videoId) return res.status(400).send('ID vidéo manquant');
    const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    https.get(thumbnailUrl, (proxyRes) => {
        proxyRes.pipe(res, { end: true });
    }).on('error', (e) => res.status(500).send('Erreur proxy'));
});

// Route 4 : Servir la "Vitrine" (index.html)
// Doit être la dernière route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Démarrage du serveur ---
// Démarre d'abord la DB, puis le serveur
initDb().then(() => {
    app.listen(port, () => {
        console.log(`Serveur démarré sur http://localhost:${port}`);
    });
}).catch(err => {
    console.error("ÉCHEC du démarrage du serveur:", err);
});
