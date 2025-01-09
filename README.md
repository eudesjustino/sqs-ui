
# SQS Admin UI
 

## Visão Geral

  

O **SQS Admin UI** é uma aplicação web desenvolvida com **Node.js** e **Express** que permite gerenciar filas **AWS SQS** de forma intuitiva. Utilizando o **LocalStack** para emular serviços da AWS localmente, esta ferramenta facilita a criação, listagem, envio e polling de mensagens em filas SQS sem a necessidade de interagir diretamente com a AWS.

  

## Funcionalidades

  

-  **Criar Filas**: Crie filas SQS padrão ou FIFO com facilidade.

-  **Listar Filas**: Visualize todas as filas existentes com detalhes.

-  **Enviar Mensagens**: Envie mensagens para filas específicas, com suporte a atributos personalizados.

-  **Polling de Mensagens**: Faça polling nas filas para visualizar mensagens recebidas.

-  **Deletar Filas e Mensagens**: Remova filas ou mensagens específicas conforme necessário.

-  **Métricas**: Obtenha estatísticas aproximadas das filas, como número de mensagens visíveis e não visíveis.

  

## Tecnologias Utilizadas

  

-  **Backend**:
     -  [Node.js](https://nodejs.org/)
     -  [Express](https://expressjs.com/)
     -  [AWS SDK v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html) para interação com o SQS
-  **Frontend**:
     -  [Bootstrap 5](https://getbootstrap.com/)
-  **DevOps**:
     -  [Docker](https://www.docker.com/)
     -  [Docker Compose](https://docs.docker.com/compose/)
-  **Emulação AWS**:
	-  [LocalStack](https://github.com/localstack/localstack)

  

## Pré-requisitos

  

-  [Docker](https://www.docker.com/get-started) e [Docker Compose](https://docs.docker.com/compose/install/) instalados na sua máquina.

- Conta no [Docker Hub](https://hub.docker.com/) para armazenar e compartilhar suas imagens Docker.

-  [Node.js](https://nodejs.org/) (opcional, se quiser executar localmente sem Docker).

### 2. Configurar as Variáveis de Ambiente

As variáveis de ambiente necessárias estão definidas no arquivo `docker-compose.yml`. Caso queira alterar algum valor, edite diretamente esse arquivo.
### 3. Construir e Iniciar os Contêineres com Docker Compose

    docker-compose up --build
Isso irá:

-   **LocalStack**: Emular serviços AWS localmente, incluindo o SQS.
-   **SQS UI**: Iniciar a aplicação web para gerenciar filas SQS.
### 4. Acessar a Aplicação

Abra o navegador e vá para: http://localhost:3000

## Utilização

### Criar uma Fila

1.  No formulário "Create Queue", insira o nome da fila.
2.  Se desejar criar uma fila FIFO, marque a opção "Create as FIFO Queue".
3.  Clique em "Create Queue".

### Listar Filas

As filas existentes serão listadas na seção "Existing Queues", exibindo a URL da fila e opções de ação.

### Enviar uma Mensagem

1.  Clique no botão "Send Message" ao lado da fila desejada.
2.  Preencha o campo "Enter message" com o conteúdo da mensagem.
3.  (Opcional) Adicione atributos personalizados clicando em "Add Attribute".
4.  Se for uma fila FIFO, preencha os campos "Deduplication ID" e "Group ID".
5.  Clique em "Send Message".

### Polling de Mensagens

1.  Clique no botão "Polling Message" ao lado da fila desejada.
2.  Uma nova janela será aberta exibindo as mensagens recebidas na fila.
3.  As mensagens não são deletadas automaticamente; elas retornam à fila após o `VisibilityTimeout`.

### Deletar uma Fila ou Mensagem

-   **Deletar Fila**: Clique no botão "Delete" ao lado da fila desejada.
-   **Deletar Mensagem**: Na interface de polling, selecione a mensagem e clique em "Delete".

## Licença

Este projeto está licenciado sob a licença MIT. Sinta-se livre para usar conforme necessário.

## Contato

-   **Eudes Justino**
-   [GitHub](https://github.com/eudesjustino)
-   [LinkedIn](https://www.linkedin.com/in/eudesjustino/)
    
