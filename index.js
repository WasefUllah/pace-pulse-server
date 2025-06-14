require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vpmsoqw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const database = client.db("pace-pulse");
    const marathonCollection = database.collection("marathons");
    const registrationCollection = database.collection("registration");

    app.get("/upcomingmarathon", async (req, res) => {
      const marathons = await marathonCollection
        .aggregate([{ $sample: { size: 6 } }])
        .toArray();
      res.send(marathons);
    });
    app.get("/allmarathons", async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = {
          createdBy: req.query.email,
        };
      }
      const result = await marathonCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/marathon/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updatedMarathon = req.body;
      const updatedDoc = {
        $set: updatedMarathon,
      };
      const result = await marathonCollection.updateOne(
        filter,
        updatedDoc,
        option
      );
      res.send(result);
    });

    app.patch("/marathon/increment/:id", async (req, res) => {
      const id = req.params.id;
      const result = await marathonCollection.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { regCount: 1 } }
      );
      res.send(result);
    });

    app.delete("/allmarathons/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await marathonCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    });

    app.get("/marathons/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await marathonCollection.findOne(query);
      res.send(result);
    });

    app.post("/marathon", async (req, res) => {
      const marathon = req.body;
      const result = await marathonCollection.insertOne(marathon);
      res.send(result);
    });

    app.post("/registrations", async (req, res) => {
      const registration = req.body;
      const result = await registrationCollection.insertOne(registration);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
