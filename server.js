/************************************************************************
 * server.js
 * Exemplo de aplicação Node/Express integrada ao SQS LocalStack
 * usando AWS SDK v3 (@aws-sdk/client-sqs).
 ************************************************************************/
 
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Importes do SDK v3
const {
  SQSClient,
  CreateQueueCommand,
  ListQueuesCommand,
  GetQueueUrlCommand,
  GetQueueAttributesCommand,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  DeleteQueueCommand
} = require('@aws-sdk/client-sqs');

const app = express();

// Lê region e endpoint de variáveis de ambiente
const REGION = process.env.AWS_REGION || 'us-east-1';
const ENDPOINT = process.env.AWS_ENDPOINT || 'http://localhost:4566';
const PORT = process.env.PORT || 3000;

/************************************************************************
 * CONFIGURAÇÃO DO CLIENTE SQS (v3)
 ************************************************************************/
// Ajuste o endpoint para apontar para o LocalStack, e a região.
const sqsClient = new SQSClient({
  region: REGION,
  endpoint: ENDPOINT,
});

/************************************************************************
 * MIDDLEWARES
 ************************************************************************/
app.use(cors());
app.use(bodyParser.json());

// Servir arquivos estáticos (HTML, CSS, JS) a partir da pasta /public
app.use(express.static(path.join(__dirname, 'public')));

/************************************************************************
 * FUNÇÕES AUXILIARES
 ************************************************************************/
/**
 * Retorna a URL da fila a partir do seu nome, usando GetQueueUrlCommand.
 * @param {string} queueName
 * @returns {Promise<string>}
 */
async function getQueueUrlByName(queueName) {
  const cmd = new GetQueueUrlCommand({ QueueName: queueName });
  const data = await sqsClient.send(cmd);
  return data.QueueUrl;
}

/**
 * Cria a fila no SQS, ajustando atributos em caso de FIFO.
 * @param {string} queueName
 * @param {boolean} isFifo
 * @returns {Promise<string>} URL da fila criada
 */
async function createSqsQueue(queueName, isFifo) {
  let finalName = queueName;
  if (isFifo && !finalName.endsWith('.fifo')) {
    finalName = `${finalName}.fifo`;
  }

  const params = {
    QueueName: finalName,
    Attributes: {},
  };

  if (isFifo) {
    params.Attributes.FifoQueue = 'true';
    // Caso queira deduplicação por conteúdo
    params.Attributes.ContentBasedDeduplication = 'true';
  }

  const cmd = new CreateQueueCommand(params);
  const result = await sqsClient.send(cmd);
  return result.QueueUrl;
}

/************************************************************************
 * ROTAS
 ************************************************************************/

/**
 * POST /queues
 * Cria uma nova fila (FIFO ou padrão).
 */
app.post('/queues', async (req, res) => {
  try {
    const { queueName, isFifo } = req.body;
    if (!queueName) {
      return res.status(400).json({ error: 'O campo queueName é obrigatório.' });
    }

    const queueUrl = await createSqsQueue(queueName, isFifo);
    return res.status(201).json({
      message: 'Fila criada com sucesso!',
      queueUrl,
    });
  } catch (err) {
    console.error('Erro ao criar fila:', err);
    return res.status(500).json({
      error: 'Erro ao criar a fila',
      details: err.message,
    });
  }
});

/**
 * GET /queues
 * Lista todas as filas existentes, retornando { name, url } de cada.
 */
app.get('/queues', async (req, res) => {
  try {
    const cmd = new ListQueuesCommand({});
    const data = await sqsClient.send(cmd);
    const queueUrls = data.QueueUrls || [];

    // Transforma cada URL em { name, url }
    const queues = queueUrls.map((url) => {
      const segments = url.split('/');
      const name = segments[segments.length - 1];
      return { name, url };
    });

    return res.status(200).json({ queues });
  } catch (err) {
    console.error('Erro ao listar filas:', err);
    return res.status(500).json({ error: 'Erro ao listar filas' });
  }
});

/**
 * DELETE /queues/:queueName
 * Deleta a fila pelo nome.
 */
app.delete('/queues/:queueName', async (req, res) => {
  try {
    const { queueName } = req.params;
    if (!queueName) {
      return res.status(400).json({ error: 'O campo queueName é obrigatório.' });
    }

    // 1) Obter a URL da fila
    const queueUrl = await getQueueUrlByName(queueName);

    // 2) Deletar a fila
    const cmd = new DeleteQueueCommand({ QueueUrl: queueUrl });
    await sqsClient.send(cmd);

    return res.status(200).json({ message: 'Fila deletada com sucesso!' });
  } catch (err) {
    console.error('Erro ao deletar fila:', err);
    return res.status(500).json({ error: 'Erro ao deletar fila' });
  }
});

/**
 * POST /queues/:queueName/messages
 * Envia uma mensagem para a fila especificada (verifica se é FIFO).
 */
app.post('/queues/:queueName/messages', async (req, res) => {
  try {
    const { queueName } = req.params;
    const { messageBody, messageAttributes, deduplicationId, groupId } = req.body;

    if (!messageBody) {
      return res.status(400).json({ error: 'O campo messageBody é obrigatório.' });
    }

    // 1) Obter a URL da fila
    const queueUrl = await getQueueUrlByName(queueName);

    // 2) Verificar se a fila é FIFO
    const getAttrsCmd = new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: ['All'],
    });
    const attrsData = await sqsClient.send(getAttrsCmd);
    const isFifo = attrsData.Attributes.FifoQueue === 'true';

    // 3) Montar parâmetros
    const params = {
      QueueUrl: queueUrl,
      MessageBody: messageBody,
      MessageAttributes: {},
    };

    // 4) Atributos customizados
    if (Array.isArray(messageAttributes)) {
      for (const attr of messageAttributes) {
        if (attr.name && attr.value) {
          params.MessageAttributes[attr.name] = {
            DataType: attr.type || 'String',
            StringValue: attr.value,
          };
        }
      }
    }

    // 5) FIFO => precisa de groupId/deduplicationId
    if (isFifo) {
      params.MessageGroupId = groupId || uuidv4();
      params.MessageDeduplicationId = deduplicationId || uuidv4();
    }

    // 6) Enviar mensagem
    const sendCmd = new SendMessageCommand(params);
    await sqsClient.send(sendCmd);

    return res.status(200).json({ message: 'Mensagem enviada com sucesso!' });
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    return res.status(500).json({
      error: 'Erro ao enviar mensagem',
      details: err.message,
    });
  }
});

/**
 * GET /queues/:queueName/messages
 * Faz polling (receiveMessage) sem deletar. Mensagens voltam após VisibilityTimeout.
 */
app.get('/queues/:queueName/messages', async (req, res) => {
  try {
    const { queueName } = req.params;
    const queueUrl = await getQueueUrlByName(queueName);

    const params = {
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 5,
      VisibilityTimeout: 0,
      AttributeNames: ['All'],
      MessageAttributeNames: ['All'],
    };

    const cmd = new ReceiveMessageCommand(params);
    const data = await sqsClient.send(cmd);

    return res.status(200).json({ messages: data.Messages || [] });
  } catch (err) {
    console.error('Erro ao fazer polling de mensagens:', err);
    return res.status(500).json({ error: 'Erro ao fazer polling de mensagens' });
  }
});

/**
 * DELETE /queues/:queueName/messages
 * Deleta uma mensagem específica da fila (precisa do receiptHandle).
 */
app.delete('/queues/:queueName/messages', async (req, res) => {
  try {
    const { queueName } = req.params;
    const { receiptHandle } = req.body;

    if (!receiptHandle) {
      return res.status(400).json({ error: 'O campo receiptHandle é obrigatório.' });
    }

    const queueUrl = await getQueueUrlByName(queueName);

    const cmd = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    });
    await sqsClient.send(cmd);

    return res.status(200).json({ message: 'Mensagem deletada com sucesso!' });
  } catch (err) {
    console.error('Erro ao deletar mensagem:', err);
    return res.status(500).json({ error: 'Erro ao deletar mensagem' });
  }
});

/**
 * GET /queues/:queueName/metrics
 * Retorna contagens aproximadas (visíveis e não visíveis) da fila.
 */
app.get('/queues/:queueName/metrics', async (req, res) => {
  try {
    const { queueName } = req.params;
    const queueUrl = await getQueueUrlByName(queueName);

    const cmd = new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: [
        'ApproximateNumberOfMessages',
        'ApproximateNumberOfMessagesNotVisible',
      ],
    });
    const data = await sqsClient.send(cmd);

    const visible = parseInt(data.Attributes.ApproximateNumberOfMessages || '0', 10);
    const inFlight = parseInt(data.Attributes.ApproximateNumberOfMessagesNotVisible || '0', 10);
    const total = visible + inFlight;

    return res.status(200).json({
      queueName,
      queueUrl,
      total,
      mensagensNaoConsumidas: visible,
      mensagensConsumidas: inFlight,
    });
  } catch (err) {
    console.error('Erro ao obter estatísticas da fila:', err);
    return res
      .status(500)
      .json({ error: 'Erro ao obter estatísticas da fila' });
  }
});

/************************************************************************
 * INICIA O SERVIDOR
 ************************************************************************/
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
