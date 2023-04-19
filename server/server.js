require("dotenv").config()
const getRawBody = require('raw-body')

const express = require("express")
const app = express()
const cors = require("cors")
app.use(express.json())
app.use(cors())


const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY)
const endpointSecret = process.env.STRIPE_SIGNING_SECRET

const storeItems = new Map([
  [1, { priceInCents: 10000, name: "Experience-1" }],
  [2, { priceInCents: 20000, name: "Experience-2" }],
  [3, { priceInCents: 30000, name: "Experience-3" }],
  [4, { priceInCents: 40000, name: "Experience-4" }],
  [5, { priceInCents: 20000, name: "Experience-5" }],
  [6, { priceInCents: 20000, name: "Experience-6" }],
])

app.post("/create-checkout-session", async (req, res) => {
  try {
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: req.body.items.map(item => {
        const storeItem = storeItems.get(item.id)
        return {
          price_data: {
            currency: "inr",
            product_data: {
              name: storeItem.name,
            },
            unit_amount: storeItem.priceInCents,
          },
          quantity: item.quantity,
        }
      }),
      success_url: `${process.env.CLIENT_URL}/success.html`,
      cancel_url: `${process.env.CLIENT_URL}/cancel.html`,
    })
    res.json({ url: session.url })
    
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})


app.post('/webhook', express.raw({type: 'application/json'}), async (request, response) => {
  let event = request.body;

  if (endpointSecret) {

    const signature = request.headers['stripe-signature'];
    try {
      // const rawBody = await getRawBody(request)
      event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        endpointSecret
      );
    } catch (err) {
      console.log(`Webhook signature verification failed.`, err.message);
      return response.sendStatus(400);
    }
    console.log(event)
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      // Then define and call a method to handle the successful payment intent.
      // handlePaymentIntentSucceeded(paymentIntent);
      break;
    case 'payment_method.attached':
      const paymentMethod = event.data.object;
      // Then define and call a method to handle the successful attachment of a PaymentMethod.
      // handlePaymentMethodAttached(paymentMethod);
      break;
    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}.`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
});








app.listen(3000, ()=>{
  console.log(`server is running`)
})
