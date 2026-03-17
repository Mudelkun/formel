const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { env } = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');
const studentsRouter = require('./modules/students/students.routes');

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use('/api/students', studentsRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

module.exports = { app };
