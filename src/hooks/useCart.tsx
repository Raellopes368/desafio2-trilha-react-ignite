import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
} from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const cartKeyStorage = '@RocketShoes:cart';
export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(cartKeyStorage);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  useEffect(() => {
    function saveCartInStorage(data: Product[]) {
      localStorage.setItem(cartKeyStorage, JSON.stringify(data));
    }

    saveCartInStorage(cart);
  }, [cart]);

  const updateStockInApi = async (
    productId: number,
    newAmount: number,
    stock: Stock
  ) => {
    api.put(`/stock/${productId}`, {
      ...stock,
      amount: newAmount,
    });
  };

  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      if (stock.amount > 0) {
        updateStockInApi(productId, stock.amount - 1, stock);
        const { data: product } = await api.get<Product>(
          `/products/${productId}`
        );
        const hasInCart = cart.find(
          (productItem) => productItem.id === productId
        );
        if (hasInCart) {
          setCart(
            cart.map((productItem) =>
              productItem.id === productId
                ? { ...productItem, amount: productItem.amount + 1 }
                : productItem
            )
          );
        } else {
          setCart([...cart, { ...product, amount: 1 }]);
        }
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const removedsProducts = cart.filter(
        (product) => product.id !== productId
      );
      const itemToRemove = cart.find((product) => product.id === productId);
      if (itemToRemove) {
        api.get<Stock>(`/stock/${productId}`).then(({ data }) => {
          updateStockInApi(productId, data.amount + itemToRemove.amount, data);
        });
        setCart(removedsProducts);
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if(amount >= 1) {
      try {
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      } catch {
        toast.error('Erro na alteração de quantidade do produto');
      }
    } 
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
