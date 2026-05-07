import app from "./src/app.js";
import { MODEL } from "./src/config/ollama.js";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`API NeuroLab rodando em http://localhost:${PORT}`);
  console.log(`Modelo: ${MODEL}`);
});
