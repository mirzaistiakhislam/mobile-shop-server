const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ status: 'unauthorized access' })
    }
    else {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN, function (e, decoded) {
            if (e) {
                return res.status(403).send({ status: 'Forbidden' })
            }
            req.decoded = decoded;
            next()
        })
    }
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iipillt.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {

    try {
        const categoriesCollection = client.db('phoneBuyAndSell').collection('categories');
        const productsCollection = client.db('phoneBuyAndSell').collection('products');
        const bookingsCollection = client.db('phoneBuyAndSell').collection('bookings');
        const reportedCollection = client.db('phoneBuyAndSell').collection('reportedItems');
        const usersCollection = client.db('phoneBuyAndSell').collection('users');
        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories);
        });
        app.get('/allsellers', verifyJWT, async (req, res) => {
            const query = { type: 'Seller' };
            const sellers = await usersCollection.find(query).toArray();
            res.send(sellers);
        });
        app.get('/allbuyers', verifyJWT, async (req, res) => {
            const query = { type: 'Buyer' };
            const buyers = await usersCollection.find(query).toArray();
            res.send(buyers);
        });
        app.get('/reporteditems', verifyJWT, async (req, res) => {
            const items = await reportedCollection.find({}).toArray();
            res.send(items);
        });
        app.get('/advertisedItems', verifyJWT, async (req, res) => {
            const items = await productsCollection.find({ advertise: 'Yes' }).toArray();
           
            res.send(items);
        });

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
                return res.send({ accessToken: token })
            }
            else {
                res.status(403).send({ accessToken: 'No token' })
            }
        })
        // app.get('/products/:id', async (req, res) => {
        //     const id = req.params.id;
        //     let query = { product_id: id };
        //     const products = await productsCollection.find(query).toArray();
        //     res.send(products);
        app.get('/categoryproducts/:id', verifyJWT,async (req, res) => {
            const id = req.params.id;
            let query = { categoryId: id, salesStatus: 'Available' };
            const products = await productsCollection.find(query).toArray();
        
            if (products.length > 0) {
                res.send(products);
            }
            else {
                const categories = await categoriesCollection.findOne({ _id: ObjectId(id) })
              
                res.send({ categoryName: categories.category_name })
            }
        });

        //bookings load on dashboard
        app.get('/orders', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            let orders = await bookingsCollection.find(query).toArray();
            const products = await productsCollection.find({}).toArray();
            const data = orders.map(order => {
                const orderId = order.productId;
                products.map(product => {
                    const productId = product._id;

                    id = productId.toString()

                    if (id == orderId) {
                        order['salesStatus'] = product['salesStatus']
                   
                    }
                })
                return order;
            })

            res.send(data);
        })


        //bookings data save into mongodb
        app.post('/bookings', verifyJWT, async (req, res) => {
            const booking = req.body;
            const query = { email: booking?.email, productId: booking?.productId }
            const found = await bookingsCollection.findOne(query);
            if (found) {
                res.send({ status: 'Already Booked!' })
            } else {
                const result = await bookingsCollection.insertOne(booking);
                res.send(result);
            }
        });

        //users data
        app.post('/adduser', async (req, res) => {
            const user = req.body;
     
            const query = { email: user?.email }
            const found = await usersCollection.findOne(query)
            if (!found) {
                const result = await usersCollection.insertOne(user);
     
                res.send(result);
            }
        })
        app.post('/addproduct', verifyJWT, async (req, res) => {
            const data = req.body;
            const result = await productsCollection.insertOne(data);
            res.send(result);

        })
        app.post('/addreporteditem', verifyJWT, async (req, res) => {
            const data = req.body;
            const query = { reportedEmail: data?.reportedEmail, productId: data.productId }
            const found = await reportedCollection.findOne(query);
         
            if (found) {
                res.send({ status: 'Already reported!' })
            }
            else {
                const result = await reportedCollection.insertOne(data);
                res.send(result);
            }


        })

        app.get('/usertypecheck/:email', verifyJWT, async (req, res) => {
        
            const email = req.params.email;
            const query = { email: email };
            const found = await usersCollection.findOne(query)
            res.send(found)
        })

        app.get('/myproducts/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { authorEmail: email };
            const products = await productsCollection.find(query).toArray()
            res.send(products)
        })
        app.delete('/deleteproduct', verifyJWT, async (req, res) => {
            const id = req.body.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })
        app.delete('/deleteseller', verifyJWT, async (req, res) => {
            const id = req.body.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })
        app.delete('/deletebuyer', verifyJWT, async (req, res) => {
            const id = req.body.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })
        app.delete('/deletereporteditem', verifyJWT, async (req, res) => {
            const id = req.body.id;
            const query = { _id: ObjectId(id) };
            const deleteProduct = await productsCollection.deleteOne(query);
            if (deleteProduct) {
                const deleteReport = await reportedCollection.deleteMany({ productId: id })
                res.send(deleteReport);
            }
            else {
                res.send({})
            }
        })
        app.put('/makeadvertise', verifyJWT, async (req, res) => {
            const id = req.body.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    advertise: 'Yes'
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, options);
            res.send(result)
        })
        app.put('/makeadverify', verifyJWT, async (req, res) => {
            const id = req.body.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    isVerified: 'Yes'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result)
        })
    }
    finally {

    }

}
run().catch(console.log);


app.get('/', async (req, res) => {
    res.send('server is running');
})

app.listen(port, () => console.log(`running on ${port}`));