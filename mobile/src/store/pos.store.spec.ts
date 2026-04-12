import { usePosStore } from './pos.store';

const sampleProduct = {
  productId: 'p-1',
  productName: 'Rice 25kg',
  barcode: '12345',
  unitPriceGhs: 100,
};

describe('usePosStore', () => {
  beforeEach(() => {
    usePosStore.setState({ cartItems: [], customerId: null, fxRate: 1 });
  });

  it('addItem() adds a new product with quantity 1', () => {
    usePosStore.getState().addItem(sampleProduct);
    const { cartItems } = usePosStore.getState();
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toBe(1);
    expect(cartItems[0].discountAmountGhs).toBe(0);
  });

  it('addItem() increments quantity if the product is already in the cart', () => {
    usePosStore.getState().addItem(sampleProduct);
    usePosStore.getState().addItem(sampleProduct);
    const { cartItems } = usePosStore.getState();
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toBe(2);
  });

  it('updateQuantity() updates the item quantity', () => {
    usePosStore.getState().addItem(sampleProduct);
    usePosStore.getState().updateQuantity('p-1', 5);
    const { cartItems } = usePosStore.getState();
    expect(cartItems[0].quantity).toBe(5);
  });

  it('updateQuantity() removes the item when quantity is set to 0', () => {
    usePosStore.getState().addItem(sampleProduct);
    usePosStore.getState().updateQuantity('p-1', 0);
    const { cartItems } = usePosStore.getState();
    expect(cartItems).toHaveLength(0);
  });

  it('updateQuantity() removes the item when quantity is negative', () => {
    usePosStore.getState().addItem(sampleProduct);
    usePosStore.getState().updateQuantity('p-1', -1);
    const { cartItems } = usePosStore.getState();
    expect(cartItems).toHaveLength(0);
  });

  it('applyDiscount() stores the discount against the correct cart item', () => {
    usePosStore.getState().addItem(sampleProduct);
    usePosStore.getState().applyDiscount('p-1', 20);
    const { cartItems } = usePosStore.getState();
    expect(cartItems[0].discountAmountGhs).toBe(20);
  });

  it('removeItem() removes the item from the cart', () => {
    usePosStore.getState().addItem(sampleProduct);
    usePosStore.getState().removeItem('p-1');
    const { cartItems } = usePosStore.getState();
    expect(cartItems).toHaveLength(0);
  });

  it('clearCart() resets all state to the initial empty values', () => {
    usePosStore.getState().addItem(sampleProduct);
    usePosStore.getState().setCustomer('cust-1');
    usePosStore.getState().setFxRate(14.5);
    usePosStore.getState().clearCart();
    const state = usePosStore.getState();
    expect(state.cartItems).toHaveLength(0);
    expect(state.customerId).toBeNull();
    expect(state.fxRate).toBe(1);
  });

  it('subtotal() sums unitPriceGhs x quantity across all items', () => {
    usePosStore.getState().addItem(sampleProduct);
    usePosStore.getState().addItem({ ...sampleProduct, productId: 'p-2', unitPriceGhs: 50 });
    usePosStore.getState().updateQuantity('p-1', 3);
    // p-1: 100 * 3 = 300, p-2: 50 * 1 = 50 → subtotal = 350
    expect(usePosStore.getState().subtotal()).toBe(350);
  });

  it('total() equals subtotal() minus sum of all discountAmountGhs', () => {
    usePosStore.getState().addItem(sampleProduct);
    usePosStore.getState().updateQuantity('p-1', 2);
    usePosStore.getState().applyDiscount('p-1', 30);
    // subtotal: 100 * 2 = 200, discount: 30 → total = 170
    const state = usePosStore.getState();
    expect(state.subtotal()).toBe(200);
    expect(state.total()).toBe(170);
  });

  it('total() equals subtotal() when no discounts are applied', () => {
    usePosStore.getState().addItem(sampleProduct);
    const state = usePosStore.getState();
    expect(state.total()).toBe(state.subtotal());
  });
});
