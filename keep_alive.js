const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Afk bot!'));

app.listen(port, '0.0.0.0', () => console.log(`Afk bot is listening to http://localhost:${port}`));