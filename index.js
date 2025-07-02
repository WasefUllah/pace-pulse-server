require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

var admin = require("firebase-admin");

var serviceAccount = require("./pace-pulse-firebase-adminsdk-fbsvc-f59383894c.json");

const port = process.env.PORT || 3000;
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(
  cors({
    origin: ["https://pace-pulse.web.app"],
    credentials: true,
  })
);
app.use(express.json());

// custom middleware
const verifyAccessToken = async (req, res, next) => {
  const token = req.headers.authorization.split("Bearer ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded = decoded;

    next();
  } catch (error) {
    console.log(error);

    res.status(401).send({ message: "unauthorized access" });
  }
};

const verifyAccessEmail = async (req, res, next) => {
  if (req.query.email !== req.decoded.email) {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
};

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

    app.get("/featuredmarathon", async (req, res) => {
      const marathons = await marathonCollection
        .aggregate([{ $sample: { size: 6 } }])
        .toArray();
      res.send(marathons);
    });
    app.get("/upcomingmarathon", async (req, res) => {
      const now = new Date();

      const marathons = await marathonCollection
        .aggregate([
          {
            $match: {
              $expr: {
                $gt: [{ $toDate: "$endRegDate" }, now],
              },
            },
          },
          {
            $sample: { size: 6 },
          },
        ])
        .toArray();

      res.send(marathons);
    });
    app.get(
      "/allmarathons",
      verifyAccessToken,
      verifyAccessEmail,
      async (req, res) => {
        let query = {};

        if (req.query.email) {
          query = {
            createdBy: req.query.email,
          };
        }
        const result = await marathonCollection.find(query).toArray();
        res.send(result);
      }
    );

    app.get("/allmarathonswithoutemail", async (req, res) => {

      if (req.query.sortOption == "registration") {
        const result = await marathonCollection
          .find()
          .sort({ startRegDate: 1 })
          .toArray();
        res.send(result);
      } else if (req.query.sortOption == "marathon") {
        const result = await marathonCollection
          .find()
          .sort({ marathonStartDate: 1 })
          .toArray();
        res.send(result);
      } else {
        const result = await marathonCollection
          .find()

          .toArray();
        res.send(result);
      }
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
    app.put("/registrations/:id", async (req, res) => {
      const id = req.params.id;

      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updatedRegistration = req.body;
      const updatedDoc = {
        $set: updatedRegistration,
      };
      const result = await registrationCollection.updateOne(
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
    app.patch("/marathon/decrement/:id", async (req, res) => {
      const id = req.params.id;

      const result = await marathonCollection.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { regCount: -1 } }
      );

      res.send(result);
    });

    app.delete("/allmarathons/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const result = await marathonCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/registrations/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await registrationCollection.deleteOne(query);
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

    app.get("/registrations/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await registrationCollection.findOne(query);
      res.send(result);
    });

    app.get(
      "/applied",
      verifyAccessToken,
      verifyAccessEmail,
      async (req, res) => {
        const email = req.query.email;
        const query = {
          userEmail: email,
        };
        const result = await registrationCollection.find(query).toArray();
        res.send(result);
      }
    );

    app.get(
      "/aggregate",
      verifyAccessToken,
      verifyAccessEmail,
      async (req, res) => {
        const email = req.query.email;
        const query = {
          userEmail: email,
        };
        const result = await registrationCollection.find(query).toArray();
        const marathonIds = result.map((reg) => reg.marathonId);
        const marathons = [];
        for (let index = 0; index < marathonIds.length; index++) {
          const query = {
            _id: new ObjectId(marathonIds[index]),
          };
          const single = await marathonCollection.findOne(query);
          if (single) {
            marathons.push(single);
          }
        }
        res.send(marathons);
      }
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
