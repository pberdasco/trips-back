import app from './app.js';

const port = Number(process.env.PORT || 5030);

app.listen(port, () => {
  console.log(`Trip App Back escuchando en puerto ${port}`);
});
