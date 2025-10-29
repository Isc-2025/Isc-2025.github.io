/*
* ===============================================
* SERVEUR BACKEND POUR LA PLATEFORME VIDÉO ISC
* ===============================================
*/

import express from 'express';
import cors from 'cors';
import https from 'https'; 
import axios from 'axios'; 

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json()); 

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// ===============================================
// BASE DE DONNÉES (SIMULÉE)
// ===============================================
let allVideos = [
    {
        "id": "yt001",
        "youtubeVideoId": "S15e-qC1S0I",
        "title": "Où va l'IA ? (Feu de Bengale)",
        "uploader": "Feu de Bengale • 215K vues",
        "keywords": ["IA", "Modèles de Langage", "Éthique", "Alignement", "Régulation"],
        "summary": "Analyse approfondie de la trajectoire actuelle de l'intelligence artificielle, de ses capacités émergentes (modèles de langage) aux risques sociétaux et existentiels. Discussion sur l'alignement et la régulation.",
        "adminAnnotation": "Excellent point de départ pour le débat sur l'IA forte. Pertinent pour le cours ISC-8001."
    },
    {
        "id": "yt002",
        "youtubeVideoId": "9to-e4c1Eho",
        "title": "Le Problème Difficile de la Conscience (David Chalmers)",
        "uploader": "David Chalmers (TED) • 2.5M vues",
        "keywords": ["Conscience", "Philosophie", "Neurosciences", "Problème Difficile", "Subjectivité"],
        "summary": "Le philosophe David Chalmers explore le \"problème difficile\" de la conscience : pourquoi et comment les processus physiques du cerveau donnent-ils lieu à une expérience subjective riche ? Il distingue les problèmes \"faciles\" (mécanismes) du problème \"difficile\" (l'expérience elle-même).",
        "adminAnnotation": ""
    },
    {
        "id": "yt003",
        "youtubeVideoId": "7s0CpR_FNA4",
        "title": "La Théorie du Langage de Chomsky",
        "uploader": "The Brain Maze • 325K vues",
        "keywords": ["Langage", "Linguistique", "Chomsky", "Grammaire Universelle", "Cognition"],
        "summary": "Cette vidéo résume les concepts clés de la théorie linguistique de Noam Chomsky, notamment la grammaire universelle, l'innéisme et le dispositif d'acquisition du langage (LAD). Elle oppose sa vision aux approches béhavioristes.",
        "adminAnnotation": "Référence classique pour l'acquisition du langage."
    },
    {
        "id": "yt004",
        "youtubeVideoId": "rS1-50LY0gA",
        "title": "Qu'est-ce que la Science Cognitive ?",
        "uploader": "Ryan Rhodes • 110K vues",
        "keywords": ["Science Cognitive", "Interdisciplinaire", "Esprit", "Cerveau", "Computation"],
        "summary": "Une introduction claire à ce qu'est la science cognitive. La vidéo la définit comme l'étude interdisciplinaire de l'esprit et de l'intelligence, combinant la psychologie, l'informatique, les neurosciences, la linguistique et la philosophie.",
        "adminAnnotation": "Bonne vidéo d'introduction pour les nouveaux étudiants."
    },
    {
        "id": "yt005",
        "youtubeVideoId": "Rz1x02nnlqg",
        "title": "La conscience, par Stanislas Dehaene",
        "uploader": "Collège de France • 180K vues",
        "keywords": ["Conscience", "Stanislas Dehaene", "Espace de Travail Global", "Neurosciences", "Signature Cérébrale"],
        "summary": "Stanislas Dehaene présente ses travaux sur les \"signatures\" cérébrales de la conscience. Il expose la théorie de l'espace de travail neuronal global (Global Neuronal Workspace), suggérant que la conscience émerge lorsqu'une information est largement diffusée à travers différents modules cérébraux.",
        "adminAnnotation": ""
    },
    {
        "id": "yt006",
        "youtubeVideoId": "i3OYlaoj-SY",
        "title": "Yuval Harari et Lex Fridman sur l'IA",
        "uploader": "Lex Fridman • 5.2M vues",
        "keywords": ["IA", "Yuval Noah Harari", "Lex Fridman", "Société", "Avenir"],
        "summary": "Une conversation profonde entre Yuval Noah Harari et Lex Fridman sur l'impact potentiel de l'intelligence artificielle sur l'humanité, l'avenir des sociétés, le pouvoir narratif et les risques existentiels.",
        "adminAnnotation": "Perspective philosophique et sociétale importante."
    }
];

// ===============================================
// ROUTES DE L'API
// ===============================================

app.get('/api/videos', (req, res) => {
    res.json(allVideos);
});

app.post('/api/add-video', async (req, res) => {
    const { videoUrl, adminAnnotation } = req.body;
    
    let videoId = null;
    try {
        const url = new URL(videoUrl);
        if (url.hostname === 'youtu.be') {
            videoId = url.pathname.slice(1);
        } else if (url.hostname.includes('youtube.com') && url.pathname === '/watch') {
            videoId = url.searchParams.get('v');
        } else if (url.hostname.includes('youtube.com') && url.pathname.startsWith('/embed/')) {
            videoId = url.pathname.split('/')[2];
        }
    } catch (error) {
        return res.status(400).json({ message: "URL YouTube invalide." });
    }

    if (!videoId) {
        return res.status(400).json({ message: "Impossible d'extraire l'ID vidéo de l'URL." });
    }

    const simulatedData = {
        title: "Titre récupéré de YouTube (Simulé)",
        uploader: "Chaîne YouTube (Simulée)",
        keywords: ["IA (Simulé)", "Keyword 2", "Keyword 3", "Keyword 4", "Keyword 5"],
        summary: `Ceci est un résumé simulé généré par IA pour la vidéo ${videoId}. Le système aurait normalement téléchargé la transcription, l'aurait envoyée à Gemini pour analyse, puis aurait renvoyé ce résumé en français.`,
        viewCount: null 
    };

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

    const newVideo = {
        id: 'yt' + Date.now(),
        youtubeVideoId: videoId,
        title: simulatedData.title,
        uploader: `${simulatedData.uploader} • ${simulatedData.viewCount ? (simulatedData.viewCount / 1000).toFixed(0) + 'K' : 'N/A'} vues`,
        keywords: simulatedData.keywords,
        summary: simulatedData.summary,
        adminAnnotation: adminAnnotation,
        viewCount: simulatedData.viewCount
    };

    allVideos.unshift(newVideo); 
    res.status(201).json(newVideo); 
});

app.get('/api/thumbnail', (req, res) => {
    const videoId = req.query.v;
    if (!videoId) {
        return res.status(400).send('ID vidéo manquant');
    }

    const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    https.get(thumbnailUrl, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    }).on('error', (e) => {
        console.error("Erreur du proxy miniature:", e);
        res.status(500).send('Erreur proxy');
    });
});

app.get('/', (req, res) => {
    res.send('Serveur Backend ISC - En ligne et opérationnel!');
});

app.listen(port, () => {
    console.log(`Serveur backend démarré sur http://localhost:${port}`);
});
