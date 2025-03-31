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
        const session = await stripe.checkout.sessions.retrieve(req.query.session_id)

        if (session.payment_status === 'paid') {
            res.render('complete.ejs', { sessionId: session.id })
        } else {
            res.send('Pagamento não concluído.')
        }
    } catch (error) {
        console.error('Erro ao recuperar sessão:', error)
        res.status(500).send('Erro ao processar o pagamento.')
    }
})

app.listen(3000, () => console.log('Server started on port 3000'))
