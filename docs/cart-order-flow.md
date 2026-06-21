# Food Miner cart and order flow

```text
Catch Gem
→ Reveal one pre-bound deal
→ Claim discount
→ Restaurant page (recommended item already in cart)
→ View cart
→ Order Summary
→ Place order
→ SQLite order record + session status ORDERED
→ Confirmation
→ Uber Eats Home toast
```

The order is added to runtime user history only after `Place order` succeeds.
Catching, claiming, opening the restaurant page, and opening the cart do not
change recommendation history.
