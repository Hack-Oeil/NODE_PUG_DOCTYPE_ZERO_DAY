const express = require("express");
const fs = require('fs');
const app = express();
const session = require('express-session');
const flash = require('express-flash-messages');
const WebSocket = require('websocket');
const client = new WebSocket.client();
const path = require('path');
const { flag, username } = require('./app/yoop_flag-d46dd5a4a7f.js');
const { absoluteUrl } = require('./app/ho-fw.js');

const mailDir = path.join(__dirname, 'mails');
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.set('view engine', 'pug');

const DEFAULT_HOST = 'http://ho-webserver';
const BOT_USER = 'technicien@youpimail.fr';
const BOT_PWD = 'ba3ad84fea52a7fbd10823dd4da1f770189fe111';


// Fonction pour générer un nouvel ID
function getNextMailId() {
    const files = fs.readdirSync(mailDir).filter(f => f.startsWith('mail_') && f.endsWith('.eml'));
    const ids = files.map(f => parseInt(f.match(/mail_(\d+)\.eml/)[1])).sort((a, b) => a - b);
    return ids.length > 0 ? ids[ids.length - 1] + 1 : 1;
}
//-------------------------------------------------------------------------------------
//                     SESSIONS ET FLASHBAG
//-------------------------------------------------------------------------------------
app.use(session({
    secret: 'd80de4a8bcc6041850b337a537823356e7f1d68e', resave: false, saveUninitialized: false,
    cookie: {
        maxAge: 3600000,
        httpOnly: false // permet l'accès au cookie via JavaScript
    }
}));
app.use(flash());


//-------------------------------------------------------------------------------------
//                           LES ROUTES
//-------------------------------------------------------------------------------------
app.get('/', (req, res) => {
    let data = {};
    if (req.session.user == BOT_USER) {
        data.flag = flag('3d0a5637e78f01edfb93d0a5637e78f01edfb984', username(req));
    }
    res.render('index', { ...data, ...req.query });
});


app.post('/send', (req, res) => {
    const { from, to, subject, message } = req.body;
    const id = getNextMailId();
    const filename = `mail_${id}.eml`;
    const mailContent = `From: ${from}\nTo: ${to}\nSubject: ${subject}\n\n${message}`;

    fs.writeFileSync(path.join(mailDir, filename), mailContent);

    // On rend la vue de confirmation, SANS redirection
    res.render('mail_sent', { id });
});

app.get('/view', (req, res) => {
    const id = req.query.id;
    const filename = `mail_${id}.eml`;
    const filePath = path.join(mailDir, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Mail introuvable.');
    }

    const content = fs.readFileSync(filePath, 'utf8');
    res.render('view', { content, ...req.query });
});

app.get('/contact', (req, res) => { res.render('contact'); });
app.post('/contact', absoluteUrl, (req, res) => {
    /*** Nettoyage dans le cas de l'utilisation du proxy ***/
    const base = res.locals.absoluteUrl("/") || "";
    const current = String(req.body.url || "");
    const pos = current.indexOf(base);
    if (pos !== -1) {
        const after = current.slice(pos + base.length);
        req.body.url = "http://localhost/" + after.replace(/^\/+/, "");
    } else {
        const u = new URL(current);
        // on conserve le "pathname + search + hash"
        req.body.url = "http://localhost/" + u.pathname.replace(/^\/+/, "") + u.search + u.hash;
    }

    /************************/
    const message = {
        debug: false,
        host: DEFAULT_HOST, // adapte ce nom
        actions: [
            {
                url: `${DEFAULT_HOST}/bd10823dd4da1f/bot/connexion?username=${BOT_USER}&password=${BOT_PWD}`,
            },
            { sleep: 1000 },
            {
                url: req.body.url
            }
        ]
    };

    // On réinitialise une connexion à chaque appel
    let firstCall = true;
    if (firstCall) {
        firstCall = false;
        client.connect('ws://ho-cyrhades-bot:8282', 'echo-protocol');
        client.once('connect', (bot) => { bot.sendUTF(JSON.stringify(message)); });
    }

    req.flash('notify', 'Nous avons bien reçu votre message !!!');
    res.redirect('/contact');
});

//--- connexion du BOT
app.get('/bd10823dd4da1f/bot/connexion', (req, res) => {
    if (req.query.username === BOT_USER && req.query.password === BOT_PWD) { req.session.user = BOT_USER; res.send('ok'); return; }
    else res.send('ko');
});

app.listen(80);
