import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
  useRef,
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

  const prevCartRef = useRef<Product[]>();

  function saveCartInStorage(data: Product[]) {
    localStorage.setItem(cartKeyStorage, JSON.stringify(data));
  }

  useEffect(() => {
    prevCartRef.current = cart;
  });

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if(cartPreviousValue !== cart) {
      saveCartInStorage(cart);
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExists = updatedCart.find(
        (productItem) => productItem.id === productId
      );
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      const currentAmount = productExists ? productExists.amount : 0;
      const amount = currentAmount + 1;
      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      } 
        
        if (productExists) {
          productExists.amount = amount;
        } else {
          const { data: product } = await api.get<Product>(
            `/products/${productId}`
          );
          updatedCart.push({ ...product, amount });
        }
        setCart(updatedCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const index = cart.findIndex(product => product.id === productId);
      if(index < 0) throw Error();
      const updatedCart = [...cart];
      updatedCart.splice(index, 1);
      setCart(updatedCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0) return;
    try {
      
      
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      const updatedCart = [...cart];
      const productExists = updatedCart.find(
        (productItem) => productItem.id === productId
      );

      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch (error) {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addProduct,
        removeProduct,
        updateProductAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
