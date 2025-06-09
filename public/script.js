// public/script.js
let quill;
let currentNoteId = null;
let db = {}; // Store all the notes objects here

window.onload = function () {
    quill = new Quill('#editor', {
        theme: 'snow'
    });

    fetch('api/user')
        .then(res => res.json())
        .then(data => {
            document.getElementById('current-user').textContent = `Bejelentkezve mint: ${data.username}`;
        });

    loadNotes();
};

function loadNotes() {
    fetch('api/notes')
        .then(res => res.json())
        .then(notes => {
            db = {}; // Reset local database
            notes.forEach(note => {
                db[note.id] = note; // Store note in local db
            });
            renderNotesList();
        });
}

function renderNotesList() {
    const list = document.getElementById('note-titles');
    list.innerHTML = '';
    Object.values(db).forEach(note => {
        const li = document.createElement('li');
        li.textContent = note.title;
        li.dataset.id = note.id;
        li.onclick = () => loadNoteById(note.id);
        if (note.id === currentNoteId) {
            li.style.fontWeight = 'bold';
        }
        list.appendChild(li);
    });
}

function loadNoteById(id) {
    const note = db[id];
    if (note) {
        currentNoteId = note.id;
        document.getElementById('note-title').textContent = note.title;
        quill.root.innerHTML = note.content;
        // Highlight selected note
        document.querySelectorAll('#note-titles li').forEach(li => {
            li.style.fontWeight = (li.dataset.id == id) ? 'bold' : 'normal';
        });
    }
}

function newNote() {
    const title = prompt('Enter note title');
    if (title) {
        currentNoteId = null;
        document.getElementById('note-title').textContent = title;
        quill.root.innerHTML = '';
        document.querySelectorAll('#note-titles li').forEach(li => li.style.fontWeight = 'normal');
    }
}

function saveNote() {
    const content = quill.root.innerHTML;
    const title = document.getElementById('note-title').textContent;
    if (!title.trim()) {
        alert('Note title is empty.');
        return;
    }

    if (currentNoteId) {
        // Update existing note
        fetch(`/api/notes/${currentNoteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, content })
        }).then(() => {
            db[currentNoteId].title = title;
            db[currentNoteId].content = content;
            renderNotesList();
        });
    } else {
        // Create new note
        fetch('/api/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, content })
        }).then(res => res.json())
            .then(data => {
                currentNoteId = data.id;
                db[currentNoteId] = { id: data.id, title, content }; // Store new note in local db
                renderNotesList();
            });
    }
}

function deleteNote() {
    if (!currentNoteId) return;
    fetch('api/notes/' + currentNoteId, {
        method: 'DELETE'
    }).then(() => {
        delete db[currentNoteId]; // Remove the note from local db
        currentNoteId = null;
        document.getElementById('note-title').textContent = '';
        quill.setText('');
        renderNotesList();
    });
}

function renameNote() {
    if (!currentNoteId) return;
    const newTitle = prompt('Enter new title:');
    if (!newTitle) return;
    fetch('api/notes/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentNoteId, title: newTitle })
    }).then(() => {
        db[currentNoteId].title = newTitle; // Update the title in local db
        document.getElementById('note-title').textContent = newTitle;
        renderNotesList();
    });
}