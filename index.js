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
        // Recupere a sessão do Stripe usando o session_id
        const session = await stripe.checkout.sessions.retrieve(req.query.session_id, {
            expand: ['payment_intent']
        });

        // Verifique o status do pagamento
        const paymentIntent = session.payment_intent;
        const paymentStatus = paymentIntent.status;

        if (paymentStatus === 'succeeded') {
            // A compra foi bem-sucedida, exiba as informações
            const lineItems = await stripe.checkout.sessions.listLineItems(req.query.session_id);

            // Exemplo de dados a serem exibidos
            const transactionDetails = {
                sessionId: session.id,
                paymentStatus: paymentStatus,
                totalAmount: session.amount_total / 100,  // Convertendo de centavos para dólares
                currency: session.currency,
                products: lineItems.data.map(item => ({
                    name: item.description,
                    quantity: item.quantity,
                    price: item.amount_total / 100,  // Convertendo de centavos para dólares
                })),
            };

            // Renderize uma página de sucesso com as informações da compra
            res.render('success', { transactionDetails });
        } else {
            // Se o pagamento falhou
            res.send('O pagamento não foi concluído com sucesso.');
        }
    } catch (error) {
        console.error('Erro ao processar o pagamento:', error);
        res.status(500).send('Houve um erro ao processar o pagamento. Tente novamente mais tarde.');
    }
});


app.get('/cancel', (req, res) => {
    res.redirect('/')
})

app.listen(3000, () => console.log('Server started on port 3000'))
