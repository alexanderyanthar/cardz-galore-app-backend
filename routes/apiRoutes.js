const express = require('express');
const { Card } = require('../models/card');
const { User } = require('../models/user.js');
const { Cart } = require('../models/cart.js');

const router = express.Router();

// Backend route to fetch paginated cards data
router.get('/api/cards', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Calculate the starting index for pagination
    const startIndex = (page - 1) * limit;

    const cards = await Card.find().skip(startIndex).limit(limit);

    res.json(cards);
  } catch (error) {
    console.error('Error fetching paginated card data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/api/featured-cards', async (req, res) => {

  try {
    const limit = 10; // Number of cards to fetch for the featured section

    const totalCount = await Card.countDocuments();

    if (totalCount <= 0) {
      // Handle the case where there are no documents to fetch
      res.status(404).json({ error: 'No documents found' });
      return;
    }

    const featuredCards = [];

    for (let i = 0; i < limit; i++) {
      const randomStartIndex = Math.floor(Math.random() * totalCount);

      const randomCard = await Card.findOne().skip(randomStartIndex).populate('sets');

      // Randomly select a set from the card's sets
      const randomSetIndex = Math.floor(Math.random() * randomCard.sets.length);
      const selectedSet = randomCard.sets[randomSetIndex];

      featuredCards.push({ ...randomCard._doc, selectedSet });
    }

    res.json(featuredCards);
  } catch (error) {
    console.error('Error fetching featured cards:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/api/cards/search', async (req, res) => {
  try {
    const searchQuery = req.query.q;

    const cards = await Card.find({ name: { $regex: searchQuery, $options: 'i' }});

    res.json(cards);
  } catch (err) {
    console.error('Error fetching searched card data:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/api/cards/suggestions', async (req, res) => {
  try {
    const searchQuery = req.query.q;

    // Query the database for suggestions based on the search query
    const suggestions = await Card.find({ name: { $regex: `^${searchQuery}`, $options: 'i' } })
      .select('name') // Select only the 'name' field
      .limit(10);

    const matchedSuggestions = suggestions.map(card => card.name);

    res.json(matchedSuggestions);
  } catch (err) {
    console.error('Error fetching suggestions:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/add-to-cart', async (req, res) => {
  const { userId, setId, cardId, quantity} = req.body;

  try {
    let cartItem = await Cart.findOne({ userId, setId });

    if (cartItem) {
      // Cart item already exists, update the quantity
      cartItem.quantity += quantity;
      await cartItem.save();
    } else {
      // Create a new cart item
      cartItem = new Cart({
        userId,
        cardId,
        setId,
        quantity,
      });
      await cartItem.save();
    }

    const user = await User.findById(userId);

    if (user) {
      if (!user.cart.includes(cartItem._id)) {
        user.cart.push(cartItem._id);
        await user.save();
      }
    }

    res.status(200).json({ 
      message: 'Item added to cart successfully',
      updatedQuantity: quantity,
    });
  } catch (err) {
    console.error('Error adding item to cart:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

router.get('/api/cart/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId).populate({
      path: 'cart',
      populate: {
        path: 'cardId', // Assuming cardId is the reference field for the Card model
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }

    const cartItems = user.cart.map((cartItem) => {
      return {
        cartId: cartItem._id,
        cardId: cartItem.cardId,
        setId: cartItem.setId,
        quantity: cartItem.quantity
      };
    });

    res.json(cartItems);
  } catch(err) {
    console.error('Error fetching cart items', err);
    res.status(500).json({ error: 'Internal server error' });
  }
})

router.put('/api/cart/:userId/:cartItemId', async (req, res) => {
    const { userId, cartItemId } = req.params;
    const { quantity } = req.body;

    try {
        const cartItem = await Cart.findById(cartItemId).populate('cardId');

        if (!cartItem) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        const originalQuantity = cartItem.quantity;
        const quantityDifference = quantity - originalQuantity;

        // Update the cart item's quantity
        cartItem.quantity = quantity;
        await cartItem.save();

        // Update the corresponding card's quantity in the main card database
        const card = cartItem.cardId;
        const setIndex = card.sets.findIndex(set => set._id.toString() === cartItem.setId.toString());

        if (setIndex !== -1) {

            // Save the cart item without updating the card's set quantity
            await cartItem.save();
        }


        res.status(200).json({ message: 'Quantity updated successfully' });
    } catch (err) {
        console.error('Error updating quantity:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.delete('/api/cart/:userId/:cartItemId', async (req, res) => {
    const { userId, cartItemId } = req.params;

    try {
        const user = await User.findByIdAndUpdate(userId, {
            $pull: { cart: cartItemId },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const deletedCartItem = await Cart.findByIdAndDelete(cartItemId);

        if (!deletedCartItem) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        res.status(200).json({ message: 'Item removed from cart successfully' });
    } catch (err) {
        console.error('Error removing item from cart:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.put('/api/update-quantity/:cardId/:setId', async (req, res) => {
  const { cardId, setId } = req.params;
  const { quantityDifference } = req.body;

  try {
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const set = card.sets.find(set => set._id.toString() === setId.toString());
    if (!set) {
      return res.status(404).json({ error: 'Set not found in card' });
    }

    set.quantity -= quantityDifference;
    await card.save();

    res.status(200).json({ message: 'Quantity updated in database' });
  } catch (err) {
    console.error('Error updating quantity in database:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/api/cards/adjust-quantity/', async (req, res) => {
  try {
    const { cardName, newQuantity, setIndex } = req.body;

    await Card.findOneAndUpdate(
      { name: cardName, 'sets._id': setIndex },
      { $set: { 'sets.$.quantity': newQuantity } },
      { new: true }
    );

    res.status(200).json({ message: 'Quantity adjusted successfully' });
  } catch (err) {
    console.error('Error adjusting quantity:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
