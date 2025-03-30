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
                name: item.name // Supondo que o item tenha um campo "name"
            },
            unit_amount: item.price * 100 // Convertendo o preço para centavos
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
        const session = await stripe.checkout.sessions.retrieve(req.query.session_id, {
            expand: ['payment_intent']
        });

        const paymentIntent = session.payment_intent;
        const lineItems = await stripe.checkout.sessions.listLineItems(req.query.session_id);

        // Crie um objeto com detalhes da transação para exibir
        const transactionDetails = {
            sessionId: session.id,
            paymentStatus: paymentIntent.status,
            totalAmount: session.amount_total / 100,  // Convertendo de centavos para dólares
            currency: session.currency,
            products: lineItems.data.map(item => ({
                name: item.description,
                quantity: item.quantity,
                price: item.amount_total / 100,  // Convertendo de centavos para dólares
            })),
        };

        // Renderize uma página de sucesso com as informações de pagamento
        res.render('success', { transactionDetails });
    } catch (error) {
        console.error('Erro ao processar o pagamento:', error);
        res.status(500).send('Houve um erro ao processar o pagamento. Tente novamente mais tarde.');
    }
});

app.get('/complete', async (req, res) => {
    const result = await Promise.all([
        stripe.checkout.sessions.retrieve(req.query.session_id, { expand: ['payment_intent.payment_method'] }),
        stripe.checkout.sessions.listLineItems(req.query.session_id)
    ])

    console.log(JSON.stringify(result))

    res.send('Your payment was successful')
})

app.get('/cancel', (req, res) => {
    res.redirect('/')
})

app.listen(3000, () => console.log('Server started on port 3000'))
