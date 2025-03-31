require('dotenv').config()
const express = require('express')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const cors = require('cors')

const app = express()

// Habilitar o parsing do corpo da requisição para JSON
app.use(express.json())

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['POST'],
    allowedHeaders: ['Content-Type']
}))

app.set('view engine', 'ejs')

app.get('/', (req, res) => {
    res.render('index.ejs')
})

app.post('/checkout', async (req, res) => {
    const { items } = req.body
    console.log(items)
    const lineItems = items.map(item => ({
        price_data: {
            currency: 'usd',
            product_data: {
                name: item.name
            },
            unit_amount: item.price * 100
        },
        quantity: item.quantity
    }))

    const session = await stripe.checkout.sessions.create({
        line_items: lineItems,
        mode: 'payment',
        shipping_address_collection: {
            allowed_countries: ['US', 'BR']
        },
        success_url: `${process.env.BASE_URL}/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BASE_URL}`
    })

    res.json({ url: session.url })
})

app.get('/complete', async (req, res) => {
    try {
        const sessionId = req.query.session_id; // Captura o session_id da URL

        if (!sessionId) {
            return res.status(400).json({ error: "Session ID is missing" });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId); // Consulta a sessão no Stripe

        res.json({
            sessionId: session.id,
            paymentStatus: session.payment_status, // 'paid', 'unpaid', etc.
            customerEmail: session.customer_details?.email || "Not available",
            amountTotal: session.amount_total / 100, // Convertendo de centavos para moeda real
            currency: session.currency
        });
    } catch (error) {
        console.error("Error fetching session:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


app.listen(3000, () => console.log('Server started on port 3000'))
