const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const app = express();
const PORT = 3000;

// Lowdb setup
const userAdapter = new FileSync('users.json');
const usersDb = low(userAdapter);
usersDb.defaults({ users: [] }).write();

const noteAdapter = new FileSync('notes.json');
const notesDb = low(noteAdapter);
notesDb.defaults({ notes: [] }).write();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'notepad_secret',
    resave: false,
    saveUninitialized: false
}));
app.use('/public', express.static(path.join(__dirname, 'public')));

// 🧱 Protect index.html (notepad page)
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Routes
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = usersDb.get('users').find({ username }).value();

    if (user && bcrypt.compareSync(password, user.password)) {
        req.session.user = username;
        res.redirect('/notepad');
    } else {
        res.status(401).send('Invalid credentials');
    }
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const userExists = usersDb.get('users').find({ username }).value();

    if (userExists) {
        return res.status(400).send('User already exists');
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    usersDb.get('users').push({ username, password: hashedPassword }).write();

    req.session.user = username;
    res.redirect('/notepad');
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

app.get('/notepad', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API routes
app.get('/api/notes', (req, res) => {
    if (!req.session.user) return res.sendStatus(401);
    const notes = notesDb.get('notes').filter({ user: req.session.user }).value();
    res.json(notes);
});

app.post('/api/notes', (req, res) => {
    if (!req.session.user) return res.sendStatus(401);
    const { title, content } = req.body;
    const id = Date.now().toString();

    notesDb.get('notes').push({ id, user: req.session.user, title, content }).write();
    res.json({ id });
});

app.put('/api/notes/:id', (req, res) => {
    if (!req.session.user) return res.sendStatus(401);
    const { title, content } = req.body;
    const note = notesDb.get('notes').find({ id: req.params.id, user: req.session.user });

    if (!note.value()) return res.sendStatus(404);

    note.assign({ title, content }).write();
    res.sendStatus(200);
});

app.delete('/api/notes/:id', (req, res) => {
    if (!req.session.user) return res.sendStatus(401);
    notesDb.get('notes').remove({ id: req.params.id, user: req.session.user }).write();
    res.sendStatus(200);
});

app.get('/api/user', (req, res) => {
    if (!req.session.user) return res.sendStatus(401);
    res.json({ username: req.session.user });
});

// Start
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
