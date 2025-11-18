import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as XLSX from 'xlsx';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ExcelProduct {
  tienda: string;
  departamento: string;
  categoria: string;
  familia: string;
  segmento: string;
  codigo: string;
  ean: string;
  descripcion: string;
  marca: string;
  proveedor: string;
  cant_existencia: number;
  'U.M.'?: string;
  precio_unitario?: number;
}

interface Product {
  id: string;
  codigo: string;
  ean: string;
  name: string;
  marca: string;
  proveedor: string;
  quantity: number;
  cantExistencia: number;
  unidadMedida: string;
  precioUnitario: number;
}

const STORAGE_KEYS = {
  EXCEL_LOADED: '@suplir_excel_loaded',
  PRODUCTS: '@suplir_products',
  EXCEL_URI: '@suplir_excel_uri',
};

export default function SuplirProductos() {
  const [permission, requestPermission] = useCameraPermissions();
  const [showScanner, setShowScanner] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [excelData, setExcelData] = useState<ExcelProduct[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ExcelProduct | null>(null);
  const [quantityInput, setQuantityInput] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showFormatInfo, setShowFormatInfo] = useState(false);
  const [excelFileUri, setExcelFileUri] = useState<string>('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeName, setEmployeeName] = useState('');
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const isProcessingScanRef = useRef(false);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalScaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadPersistedData();
  }, []);

  useEffect(() => {
    if (!isLoadingData) {
      saveProductsToStorage(products);
    }
  }, [products, isLoadingData]);

  useEffect(() => {
    if (showProductModal) {
      Animated.spring(modalScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      modalScaleAnim.setValue(0);
    }
  }, [showProductModal]);

  // Función para normalizar la unidad de medida
  const normalizeUnit = (unit: string | undefined): string => {
    if (!unit) return 'UND';
    const normalized = unit.trim().toUpperCase();
    if (normalized === 'UND' || normalized === 'UNIDAD' || normalized === 'UNIDADES') {
      return 'UND';
    }
    return normalized;
  };

  // Función para formatear precio en pesos colombianos
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const loadExcelFromUri = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelProduct[];

      return jsonData;
    } catch (error) {
      console.error('Error cargando Excel desde URI:', error);
      return null;
    }
  };

  const loadPersistedData = async () => {
    try {
      setIsLoadingData(true);
      
      const excelLoaded = await AsyncStorage.getItem(STORAGE_KEYS.EXCEL_LOADED);
      const savedUri = await AsyncStorage.getItem(STORAGE_KEYS.EXCEL_URI);
      
      if (excelLoaded === 'true' && savedUri) {
        const data = await loadExcelFromUri(savedUri);
        if (data) {
          //console.log(data)
          setExcelData(data);
          setExcelFileUri(savedUri);
          console.log('✅ Excel cargado desde archivo:', data.length, 'productos');
        } else {
          await AsyncStorage.removeItem(STORAGE_KEYS.EXCEL_LOADED);
          await AsyncStorage.removeItem(STORAGE_KEYS.EXCEL_URI);
        }
      }

      const savedProducts = await AsyncStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (savedProducts) {
        const parsedProducts = JSON.parse(savedProducts);
        setProducts(parsedProducts);
        console.log('✅ Productos cargados:', parsedProducts.length);
      }
    } catch (error) {
      console.error('❌ Error al cargar datos guardados:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const saveExcelReference = async (uri: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EXCEL_LOADED, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.EXCEL_URI, uri);
      console.log('💾 Referencia de Excel guardada');
    } catch (error) {
      console.error('❌ Error al guardar referencia del Excel:', error);
    }
  };

  const saveProductsToStorage = async (data: Product[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data));
      console.log('💾 Productos guardados');
    } catch (error) {
      console.error('❌ Error al guardar productos:', error);
    }
  };

  const handleLoadExcel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setIsLoadingExcel(true);
      setLoadingProgress(0);

      const uri = result.assets[0].uri;
      
      setLoadingProgress(20);
      
      const response = await fetch(uri);
      const blob = await response.blob();
      
      setLoadingProgress(40);
      
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      setLoadingProgress(60);

      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      setLoadingProgress(80);
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelProduct[];

      setLoadingProgress(100);
      
      setExcelData(jsonData);
      setExcelFileUri(uri);
      await saveExcelReference(uri);
      
      setTimeout(() => {
        setIsLoadingExcel(false);
        setLoadingProgress(0);
        Alert.alert('Éxito', `Se cargaron ${jsonData.length} productos del Excel`);
      }, 500);
      
    } catch (error) {
      console.error('Error al cargar Excel:', error);
      setIsLoadingExcel(false);
      setLoadingProgress(0);
      Alert.alert('Error', 'No se pudo cargar el archivo Excel. Verifica el formato.');
    }
  };

  const handleDeleteExcel = () => {
    Alert.alert(
      'Confirmar',
      '¿Deseas eliminar el archivo Excel cargado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(STORAGE_KEYS.EXCEL_LOADED);
              await AsyncStorage.removeItem(STORAGE_KEYS.EXCEL_URI);
              setExcelData([]);
              setExcelFileUri('');
              Alert.alert('Éxito', 'Excel eliminado correctamente');
            } catch (error) {
              console.error('Error al eliminar Excel:', error);
              Alert.alert('Error', 'No se pudo eliminar el Excel');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAllProducts = () => {
    if (products.length === 0) {
      Alert.alert('Aviso', 'No hay productos para eliminar');
      return;
    }

    Alert.alert(
      'Confirmar',
      `¿Deseas eliminar todos los ${products.length} productos agregados?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Todo',
          style: 'destructive',
          onPress: async () => {
            try {
              setProducts([]);
              await AsyncStorage.removeItem(STORAGE_KEYS.PRODUCTS);
              Alert.alert('Éxito', 'Todos los productos fueron eliminados');
            } catch (error) {
              console.error('Error al eliminar productos:', error);
            }
          },
        },
      ]
    );
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (isProcessingScanRef.current) return;
    
    console.log('📷 Código detectado:', data);
    isProcessingScanRef.current = true;
    setShowScanner(false);
    
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    
    // Verificar si el código escaneado tiene contenido válido
    if (!data || data.trim().length === 0) {
      Alert.alert(
        'Escaneo inválido',
        'No se pudo leer el código de barras correctamente. Por favor intenta escanear nuevamente.',
        [{ 
          text: 'Reintentar', 
          onPress: () => {
            isProcessingScanRef.current = false;
            setShowScanner(true);
          }
        }]
      );
      return;
    }
    
    searchProductInExcel(data);
    
    scanTimeoutRef.current = setTimeout(() => {
      isProcessingScanRef.current = false;
      scanTimeoutRef.current = null;
    }, 2000);
  };

  const searchProductInExcel = (searchTerm: string) => {
    if (excelData.length === 0) {
      Alert.alert('Error', 'Primero debes cargar un archivo Excel');
      return;
    }

    const normalizedSearch = String(searchTerm).trim();
    const foundProduct = excelData.find((p) => {
      const codigo = String(p.codigo || '').trim();
      const ean = String(p.ean || '').trim();
      return codigo === normalizedSearch || ean === normalizedSearch;
    });
    
    if (foundProduct) {
      console.log('✅ Encontrado:', foundProduct.descripcion);
      setSelectedProduct(foundProduct);
      setQuantityInput('');
      setShowProductModal(true);
    } else {
      console.log('❌ No encontrado:', normalizedSearch);
      Alert.alert(
        'Producto no encontrado',
        'El código escaneado o ingresado no existe en el inventario.\n\nVerifica:\n• Que el código sea correcto\n• Que el producto esté en el Excel cargado\n• Si escaneaste, intenta escanear de nuevo',
        [{ text: 'Entendido', style: 'default' }]
      );
    }
  };

  const handleManualSearch = () => {
    if (!scannedBarcode.trim()) {
      Alert.alert(
        'Campo vacío',
        'Por favor ingresa un código o EAN para buscar el producto',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }
    Keyboard.dismiss();
    searchProductInExcel(scannedBarcode.trim());
  };

  const handleAddProductFromModal = () => {
    if (!selectedProduct || !quantityInput) {
      Alert.alert('Error', 'Ingresa la cantidad requerida');
      return;
    }

    const quantity = parseFloat(quantityInput);

    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida');
      return;
    }

    if (quantity > selectedProduct.cant_existencia) {
      Alert.alert(
        'Error',
        `No hay suficiente existencia. Disponible: ${selectedProduct.cant_existencia}`
      );
      return;
    }

    const unidadMedida = normalizeUnit(selectedProduct['U.M.']);
    const precioUnitario = selectedProduct.precio_unitario || 0;

    const newProduct: Product = {
      id: Date.now().toString(),
      codigo: selectedProduct.codigo,
      ean: selectedProduct.ean,
      name: selectedProduct.descripcion,
      marca: selectedProduct.marca,
      proveedor: selectedProduct.proveedor,
      quantity: quantity,
      cantExistencia: selectedProduct.cant_existencia,
      unidadMedida: unidadMedida,
      precioUnitario: precioUnitario,
    };

    setProducts([...products, newProduct]);
    handleCloseProductModal();
  };

  const handleDeleteProduct = (id: string) => {
    Alert.alert('Confirmar', '¿Deseas eliminar este producto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => setProducts(products.filter((p) => p.id !== id)),
      },
    ]);
  };

  const handleIncreaseQuantity = (id: string) => {
    setProducts(
      products.map((p) => {
        if (p.id === id) {
          const newQuantity = p.quantity + (p.unidadMedida === 'UND' ? 1 : 0.1);
          if (newQuantity > p.cantExistencia) {
            Alert.alert('Error', `Existencia máxima: ${p.cantExistencia}`);
            return p;
          }
          return { ...p, quantity: parseFloat(newQuantity.toFixed(2)) };
        }
        return p;
      })
    );
  };

  const handleDecreaseQuantity = (id: string) => {
    setProducts(
      products.map((p) => {
        if (p.id === id) {
          const decrement = p.unidadMedida === 'UND' ? 1 : 0.1;
          const newQuantity = p.quantity - decrement;
          if (newQuantity < decrement) return p;
          return { ...p, quantity: parseFloat(newQuantity.toFixed(2)) };
        }
        return p;
      })
    );
  };

  const filteredProducts = products.filter((product) => {
    const name = (product.name || "").toString().toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query);
  });

  const getDuplicateProducts = () => {
    const duplicates: { codigo: string; ean: string; count: number; ids: string[] }[] = [];
    const productMap = new Map<string, { count: number; ids: string[] }>();

    products.forEach((product) => {
      const key = `${product.codigo}-${product.ean}`;
      if (productMap.has(key)) {
        const existing = productMap.get(key)!;
        existing.count++;
        existing.ids.push(product.id);
      } else {
        productMap.set(key, { count: 1, ids: [product.id] });
      }
    });

    productMap.forEach((value, key) => {
      if (value.count > 1) {
        const [codigo, ean] = key.split('-');
        duplicates.push({ codigo, ean, count: value.count, ids: value.ids });
      }
    });

    return duplicates;
  };

  const duplicateProducts = getDuplicateProducts();
  const hasDuplicates = duplicateProducts.length > 0;

  const showDuplicatesAlert = () => {
    const message = duplicateProducts
      .map((dup) => `• Código: ${dup.codigo} (${dup.count} veces)`)
      .join('\n');

    Alert.alert(
      '⚠️ Productos Duplicados',
      `Se encontraron los siguientes productos duplicados:\n\n${message}\n\nRevisa y elimina los duplicados antes de generar el PDF.`,
      [{ text: 'Entendido', style: 'default' }]
    );
  };

  const handleGeneratePDF = async () => {
    if (products.length === 0) {
      Alert.alert('Error', 'No hay productos para generar el PDF');
      return;
    }

    setShowEmployeeModal(true);
  };

  const confirmGeneratePDF = async () => {
    if (!employeeName.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre de quien realiza el pedido');
      return;
    }

    setShowEmployeeModal(false);

    try {
      const currentDate = new Date().toLocaleDateString('es-CO');
      const currentTime = new Date().toLocaleTimeString('es-CO');

      const totalValue = products.reduce((sum, p) => sum + (p.quantity * p.precioUnitario), 0);

      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              @page { margin: 20px; size: A4; }
              body { font-family: 'Arial', sans-serif; padding: 20px; color: #2C3E50; margin: 0; }
              h1 { color: #6C5CE7; text-align: center; margin-bottom: 5px; font-size: 22px; }
              .header-info { text-align: center; color: #7F8C8D; margin-bottom: 15px; font-size: 11px; }
              .employee-info { text-align: center; color: #2C3E50; margin-bottom: 20px; font-size: 12px; font-weight: bold; background-color: #F0EFFF; padding: 8px; border-radius: 5px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; page-break-inside: auto; }
              thead { display: table-header-group; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              th { background-color: #6C5CE7; color: white; padding: 8px 6px; text-align: left; font-weight: bold; font-size: 10px; }
              td { padding: 6px; border-bottom: 1px solid #ECF0F1; font-size: 9px; }
              tr:nth-child(even) { background-color: #F8F9FA; }
              .total { margin-top: 15px; text-align: right; font-size: 13px; font-weight: bold; color: #6C5CE7; page-break-inside: avoid; }
              .footer { margin-top: 30px; text-align: center; color: #95A5A6; font-size: 9px; page-break-inside: avoid; }
              .text-right { text-align: right; }
            </style>
          </head>
          <body>
            <h1>Reporte de Suplido de Productos</h1>
            <div class="header-info"><p>Fecha: ${currentDate} | Hora: ${currentTime}</p></div>
            <div class="employee-info">Pedido realizado por: ${employeeName.trim()}</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 10%;">Código</th>
                  <th style="width: 12%;">EAN</th>
                  <th style="width: 28%;">Descripción</th>
                  <th style="width: 15%;">Marca</th>
                  <th style="width: 10%;">Cantidad</th>
                  <th style="width: 12%;">P. Unitario</th>
                  <th style="width: 13%;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${products.map(product => `
                  <tr>
                    <td>${product.codigo}</td>
                    <td>${product.ean}</td>
                    <td>${product.name}</td>
                    <td>${product.marca}</td>
                    <td>${product.quantity} ${product.unidadMedida}</td>
                    <td class="text-right">${formatPrice(product.precioUnitario)}</td>
                    <td class="text-right">${formatPrice(product.quantity * product.precioUnitario)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total">
              Total de productos: ${products.length} | Valor total: ${formatPrice(totalValue)}
            </div>
            <div class="footer"><p>Generado por Tiendi App</p></div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      Alert.alert('PDF Generado', '¿Qué deseas hacer?', [
        {
          text: 'Compartir',
          onPress: async () => {
            try {
              await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            } catch (shareError) {
              console.log('Compartir cancelado o error:', shareError);
            }
          },
        },
        {
          text: 'Imprimir',
          onPress: async () => {
            try {
              await Print.printAsync({ uri });
            } catch (printError) {
              console.log('Impresión cancelada o error:', printError);
            }
          },
        },
        { text: 'Cerrar', style: 'cancel' },
      ]);
      
      setEmployeeName('');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo generar el PDF');
    }
  };

  const handleOpenScanner = async () => {
    if (excelData.length === 0) {
      Alert.alert('Error', 'Primero carga un archivo Excel');
      return;
    }

    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara');
        return;
      }
    }
    
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    isProcessingScanRef.current = false;
    setShowScanner(true);
  };

  const handleCloseScanner = () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    isProcessingScanRef.current = false;
    setShowScanner(false);
  };

  const handleCloseProductModal = () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    isProcessingScanRef.current = false;
    setShowProductModal(false);
    setScannedBarcode('');
    setSelectedProduct(null);
    setQuantityInput('');
    Keyboard.dismiss();
  };

  if (isLoadingData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Suplir Productos</Text>
            <Text style={styles.headerSubtitle}>
              {products.length} producto{products.length !== 1 ? 's' : ''} agregado{products.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.infoButton}
            onPress={() => setShowFormatInfo(true)}
          >
            <Ionicons name="information-circle-outline" size={28} color="#6C5CE7" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Sección Excel compacta */}
          <View style={styles.excelSection}>
            <View style={styles.excelRow}>
              <TouchableOpacity style={styles.excelButtonCompact} onPress={handleLoadExcel}>
                <Ionicons name="document" size={20} color="#FFFFFF" />
                <Text style={styles.excelButtonTextCompact}>
                  {excelData.length > 0 ? `${excelData.length} productos` : 'Cargar Excel'}
                </Text>
              </TouchableOpacity>

              {excelData.length > 0 && (
                <>
                  <View style={styles.excelStatus}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.excelStatusText}>Guardado</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.deleteExcelIcon} 
                    onPress={handleDeleteExcel}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Formulario de búsqueda */}
          {excelData.length > 0 && (
            <View style={styles.searchSection}>
              <Text style={styles.searchLabel}>Buscar Producto</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Código o EAN"
                  value={scannedBarcode}
                  onChangeText={setScannedBarcode}
                  keyboardType="default"
                  returnKeyType="search"
                  onSubmitEditing={handleManualSearch}
                />
                <TouchableOpacity style={styles.iconButton} onPress={handleOpenScanner}>
                  <Ionicons name="barcode-outline" size={24} color="#6C5CE7" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={handleManualSearch}>
                  <Ionicons name="search" size={24} color="#4ECDC4" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Lista de productos */}
          {products.length > 0 && (
            <View style={styles.productsSection}>
              <View style={styles.productsTitleRow}>
                <Text style={styles.productsTitle}>Productos Agregados</Text>
                <View style={styles.headerIcons}>
                  {hasDuplicates && (
                    <TouchableOpacity
                      style={styles.duplicateWarningButton}
                      onPress={showDuplicatesAlert}
                    >
                      <Ionicons name="warning" size={20} color="#FF9800" />
                      <Text style={styles.duplicateWarningText}>{duplicateProducts.length}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.deleteAllIcon}
                    onPress={handleDeleteAllProducts}
                  >
                    <Ionicons name="trash" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Barra de búsqueda de productos */}
              <View style={styles.productsSearchBar}>
                <Ionicons name="search" size={18} color="#7F8C8D" />
                <TextInput
                  style={styles.productsSearchInput}
                  placeholder="Buscar por nombre"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#7F8C8D" />
                  </TouchableOpacity>
                )}
              </View>

              {filteredProducts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={40} color="#BDC3C7" />
                  <Text style={styles.emptyStateText}>No se encontraron productos</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredProducts}
                  scrollEnabled={false}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.productCard}>
                      <View style={styles.productMain}>
                        <View style={styles.productHeader}>
                          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                          <TouchableOpacity
                            style={styles.deleteProductIcon}
                            onPress={() => handleDeleteProduct(item.id)}
                          >
                            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.productDetails}>
                          {item.codigo} • {item.ean}
                        </Text>
                        <Text style={styles.productBrand}>
                          {item.marca}
                        </Text>
                        
                        {/* Información de precio y unidad */}
                        <View style={styles.priceUnitRow}>
                          <View style={styles.priceContainer}>
                            <Ionicons name="pricetag" size={14} color="#6C5CE7" />
                            <Text style={styles.priceText}>{formatPrice(item.precioUnitario)}</Text>
                          </View>
                          <View style={styles.unitBadge}>
                            <Text style={styles.unitText}>{item.unidadMedida}</Text>
                          </View>
                        </View>

                        {/* Subtotal */}
                        <View style={styles.subtotalContainer}>
                          <Text style={styles.subtotalLabel}>Subtotal:</Text>
                          <Text style={styles.subtotalValue}>
                            {formatPrice(item.quantity * item.precioUnitario)}
                          </Text>
                        </View>

                        <View style={styles.quantityRow}>
                          <TouchableOpacity
                            style={styles.quantityBtn}
                            onPress={() => handleDecreaseQuantity(item.id)}
                          >
                            <Ionicons name="remove" size={18} color="#6C5CE7" />
                          </TouchableOpacity>
                          <View style={styles.quantityDisplayContainer}>
                            <Text style={styles.quantityText}>{item.quantity}</Text>
                            <Text style={styles.quantityUnit}>{item.unidadMedida}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.quantityBtn}
                            onPress={() => handleIncreaseQuantity(item.id)}
                          >
                            <Ionicons name="add" size={18} color="#6C5CE7" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Botón PDF flotante */}
      {products.length > 0 && (
        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity style={styles.pdfFloatingButton} onPress={handleGeneratePDF}>
            <Ionicons name="document-text" size={26} color="#FFFFFF" />
            <Text style={styles.pdfFloatingText}>Generar PDF</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de carga de Excel */}
      <Modal
        visible={isLoadingExcel}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {}}
      >
        <View style={styles.loadingModalOverlay}>
          <View style={styles.loadingModalContent}>
            <Ionicons name="document" size={50} color="#6C5CE7" />
            <Text style={styles.loadingModalTitle}>Cargando Excel</Text>
            <Text style={styles.loadingModalSubtitle}>Por favor espera...</Text>
            
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${loadingProgress}%` }]} />
            </View>
            
            <Text style={styles.progressText}>{loadingProgress}%</Text>
          </View>
        </View>
      </Modal>

      {/* Modal para nombre del empleado */}
      <Modal
        visible={showEmployeeModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowEmployeeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            activeOpacity={1} 
            style={{flex:1}}
            onPress={() => {
              Keyboard.dismiss();
              setShowEmployeeModal(false);
            }}
          >
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{flex:1, justifyContent: 'center'}}
            >
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <View style={styles.employeeModalContent}>
                <View style={styles.employeeModalHeader}>
                  <Ionicons name="person-circle" size={50} color="#6C5CE7" />
                  <Text style={styles.employeeModalTitle}>¿Quién realiza el pedido?</Text>
                </View>

                <View style={styles.employeeModalBody}>
                  <Text style={styles.employeeModalLabel}>Nombre del empleado:</Text>
                  <TextInput
                    style={styles.employeeModalInput}
                    placeholder="Ingresa tu nombre"
                    value={employeeName}
                    onChangeText={setEmployeeName}
                    autoFocus={true}
                    returnKeyType="done"
                    onSubmitEditing={confirmGeneratePDF}
                  />
                </View>

                <View style={styles.employeeModalButtons}>
                  <TouchableOpacity
                    style={[styles.employeeModalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowEmployeeModal(false);
                      setEmployeeName('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.employeeModalButton, styles.confirmButton]}
                    onPress={confirmGeneratePDF}
                  >
                    <Text style={styles.confirmButtonText}>Continuar</Text>
                  </TouchableOpacity>
                </View>
              </View>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal información de formato */}
      <Modal
        visible={showFormatInfo}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowFormatInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={{flex:1}}
            activeOpacity={1}
            onPress={() => setShowFormatInfo(false)}
          >
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{flex:1, justifyContent: 'center'}}
            >
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <View style={styles.formatModalContent}>
              <View style={styles.formatModalHeader}>
                <Ionicons name="information-circle" size={40} color="#6C5CE7" />
                <Text style={styles.formatModalTitle}>Formato del Excel</Text>
              </View>
              <Text style={styles.formatModalText}>
                El archivo Excel debe contener las siguientes columnas:
              </Text>
              <View style={styles.formatList}>
                <Text style={styles.formatItem}>• <Text style={styles.formatBold}>codigo</Text> (texto)</Text>
                <Text style={styles.formatItem}>• <Text style={styles.formatBold}>ean</Text> (texto/número)</Text>
                <Text style={styles.formatItem}>• <Text style={styles.formatBold}>descripcion</Text> (texto)</Text>
                <Text style={styles.formatItem}>• <Text style={styles.formatBold}>marca</Text> (texto)</Text>
                <Text style={styles.formatItem}>• <Text style={styles.formatBold}>proveedor</Text> (texto)</Text>
                <Text style={styles.formatItem}>• <Text style={styles.formatBold}>cant_existencia</Text> (número)</Text>
                <Text style={styles.formatItem}>• <Text style={styles.formatBold}>U.M.</Text> (texto: UND, KG, GR, etc.)</Text>
                <Text style={styles.formatItem}>• <Text style={styles.formatBold}>precio_unitario</Text> (número)</Text>
              </View>
              <View style={styles.formatNote}>
                <Ionicons name="warning" size={16} color="#FF9800" />
                <Text style={styles.formatNoteText}>
                  Asegúrate de que los nombres de las columnas coincidan exactamente como se muestran arriba.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.formatModalButton}
                onPress={() => setShowFormatInfo(false)}
              >
                <Text style={styles.formatModalButtonText}>Entendido</Text>
              </TouchableOpacity>
            </View>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </View>
      </Modal>

     {/* Modal del escáner */}
<Modal
  visible={showScanner}
  animationType="slide"
  onRequestClose={handleCloseScanner}
>
  <View style={styles.scannerContainer}>
    <CameraView
      style={styles.camera}
      facing="back"
      barcodeScannerSettings={{
        barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'upc_a', 'upc_e'],
      }}
      onBarcodeScanned={isProcessingScanRef.current ? undefined : handleBarcodeScanned}
    />
    
    {/* Overlay con posicionamiento absoluto - FUERA de CameraView */}
    <View style={styles.scannerOverlay}>
      <Text style={styles.scannerText}>Apunta al código de barras</Text>
      <View style={styles.scannerFrame} />
    </View>

    <TouchableOpacity
      style={styles.closeButton}
      onPress={handleCloseScanner}
    >
      <Ionicons name="close-circle" size={50} color="#FFFFFF" />
    </TouchableOpacity>
  </View>
</Modal>

{/* MODAL DE PRODUCTO */}

<Modal
  visible={showProductModal}
  animationType="slide"
  transparent={true}
  onRequestClose={handleCloseProductModal}
>
  <KeyboardAvoidingView 
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={{flex: 1}}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
  >
    <View style={styles.modalOverlay}>
      <TouchableOpacity 
        style={{flex:1}}
        activeOpacity={1}
        onPress={handleCloseProductModal}
      >
        <View style={{flex:1, justifyContent: 'flex-end'}}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.productModalContent}>
              {/* Header fijo */}
              <View style={styles.productModalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <Ionicons name="checkmark-circle" size={28} color="#4ECDC4" />
                  <Text style={styles.productModalTitle}>Producto Encontrado</Text>
                </View>
                <TouchableOpacity onPress={handleCloseProductModal} style={styles.closeIconButton}>
                  <Ionicons name="close" size={24} color="#7F8C8D" />
                </TouchableOpacity>
              </View>

              {/* Contenido scrolleable CON BOTONES INCLUIDOS */}
              <ScrollView 
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={true}
              >
                {selectedProduct && (
                  <>
                    <View style={styles.productModalBody}>
                      {/* Nombre del producto */}
                      <View style={styles.modalField}>
                        <Text style={styles.modalFieldLabel}>Producto</Text>
                        <Text style={styles.modalFieldValue}>{selectedProduct.descripcion}</Text>
                      </View>

                      {/* Marca y Proveedor en fila */}
                      <View style={styles.modalTwoColumns}>
                        <View style={[styles.modalField, { flex: 1, marginBottom: 0 }]}>
                          <Text style={styles.modalFieldLabel}>Marca</Text>
                          <Text style={styles.modalFieldValueSmall}>{selectedProduct.marca}</Text>
                        </View>
                        <View style={[styles.modalField, { flex: 1, marginBottom: 0 }]}>
                          <Text style={styles.modalFieldLabel}>Proveedor</Text>
                          <Text style={styles.modalFieldValueSmall}>{selectedProduct.proveedor}</Text>
                        </View>
                      </View>

                      {/* Existencia y Precio en fila */}
                      <View style={styles.modalTwoColumns}>
                        <View style={[styles.modalField, { flex: 1, marginBottom: 0 }]}>
                          <Text style={styles.modalFieldLabel}>Existencia</Text>
                          <Text style={styles.modalFieldValueHighlight}>
                            {selectedProduct.cant_existencia} {normalizeUnit(selectedProduct['U.M.'])}
                          </Text>
                        </View>
                        <View style={[styles.modalField, { flex: 1, marginBottom: 0 }]}>
                          <Text style={styles.modalFieldLabel}>Precio Unitario</Text>
                          <Text style={styles.modalFieldValuePrice}>
                            {formatPrice(selectedProduct.precio_unitario || 0)}
                          </Text>
                        </View>
                      </View>

                      {/* Input de cantidad */}
                      <View style={styles.modalField}>
                        <Text style={styles.modalFieldLabel}>
                          Cantidad Requerida ({normalizeUnit(selectedProduct['U.M.'])})
                        </Text>
                        <TextInput
                          style={styles.modalQuantityInput}
                          placeholder={`Ej: 10`}
                          placeholderTextColor="#95A5A6"
                          value={quantityInput}
                          onChangeText={setQuantityInput}
                          keyboardType="decimal-pad"
                          returnKeyType="done"
                          onSubmitEditing={handleAddProductFromModal}
                        />
                      </View>
                    </View>

                    {/* Botones DENTRO del ScrollView */}
                    <View style={styles.modalFooterInside}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.modalButtonCancel]}
                        onPress={handleCloseProductModal}
                      >
                        <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.modalButtonConfirm]}
                        onPress={handleAddProductFromModal}
                      >
                        <Text style={styles.modalButtonTextConfirm}>Agregar</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  </KeyboardAvoidingView>
</Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#6C5CE7',
    fontWeight: '600',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  infoButton: {
    padding: 6,
  },
  scrollView: {
    flex: 1,
  },
  excelSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  excelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  excelButtonCompact: {
    backgroundColor: '#FF8B94',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#FF8B94',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  excelButtonTextCompact: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  excelStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  excelStatusText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  deleteExcelIcon: {
    backgroundColor: '#FFE5E5',
    padding: 8,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  searchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 15,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  iconButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  productsSection: {
    paddingHorizontal: 20,
  },
  productsTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  duplicateWarningButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  duplicateWarningText: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '700',
  },
  deleteAllIcon: {
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 8,
  },
  productsSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  productsSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#2C3E50',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#95A5A6',
    marginTop: 8,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  productMain: {
    flex: 1,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  productName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    marginRight: 8,
  },
  deleteProductIcon: {
    padding: 4,
  },
  productDetails: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 3,
  },
  productBrand: {
    fontSize: 12,
    color: '#95A5A6',
    marginBottom: 8,
  },
  priceUnitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  unitBadge: {
    backgroundColor: '#F0EFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  subtotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  subtotalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  subtotalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0EFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    minWidth: 60,
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    color: '#6C5CE7',
    fontWeight: '700',
  },
  quantityUnit: {
    fontSize: 12,
    color: '#6C5CE7',
    fontWeight: '600',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 50 : 40,
    left: 20,
    right: 20,
  },
  pdfFloatingButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pdfFloatingText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  loadingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 15,
    marginBottom: 5,
  },
  loadingModalSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  formatModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  formatModalHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  formatModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 10,
  },
  formatModalText: {
    fontSize: 15,
    color: '#7F8C8D',
    marginBottom: 14,
    lineHeight: 22,
  },
  formatList: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
  },
  formatItem: {
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 6,
    fontWeight: '500',
  },
  formatBold: {
    fontWeight: '700',
    color: '#6C5CE7',
  },
  formatNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 18,
  },
  formatNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#E65100',
    lineHeight: 18,
  },
  formatModalButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  formatModalButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  scannerContainer: {
  flex: 1,
  backgroundColor: '#000000',
  position: 'relative', // Agregado
},
  camera: {
  flex: 1,
  position: 'absolute', // Agregado
  top: 0,              // Agregado
  left: 0,             // Agregado
  right: 0,            // Agregado
  bottom: 0,           // Agregado
},
scannerOverlay: {
  ...StyleSheet.absoluteFillObject, // Cambiado
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  pointerEvents: 'box-none', // Agregado - permite que los eventos pasen a la cámara
},
  scannerText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 30,
  },
  scannerFrame: {
    width: 280,
    height: 280,
    borderWidth: 3,
    borderColor: '#6C5CE7',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  closeButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalKeyboardAvoidingView: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  productModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: Platform.OS === 'android' ? SCREEN_HEIGHT * 0.85 : SCREEN_HEIGHT * 0.75,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  productModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  productModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    flex: 1,
  },
  closeIconButton: {
    padding: 4,
  },
  modalScrollView: {
  flexGrow: 1,
},
  modalScrollContent: {
  paddingBottom: 20,
  flexGrow: 1,
},
modalFooterInside: {
  flexDirection: 'row',
  gap: 12,
  paddingHorizontal: 20,
  paddingTop: 20,
  paddingBottom: Platform.OS === 'android' ? 40 : 20,
  borderTopWidth: 1,
  borderTopColor: '#F0F0F0',
  backgroundColor: '#FFFFFF',
},
  productModalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalField: {
    marginBottom: 14,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalFieldValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    lineHeight: 20,
  },
  modalFieldValueSmall: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
    lineHeight: 18,
  },
  modalFieldValueHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4ECDC4',
  },
  modalFieldValuePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  modalTwoColumns: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  modalQuantityInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#2C3E50',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    fontWeight: '600',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F0F0F0',
  },
  modalButtonTextCancel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7F8C8D',
  },
  modalButtonConfirm: {
    backgroundColor: '#4ECDC4',
  },
  modalButtonTextConfirm: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  employeeModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  employeeModalHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  employeeModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 10,
    textAlign: 'center',
  },
  employeeModalBody: {
    marginBottom: 18,
  },
  employeeModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 8,
  },
  employeeModalInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  employeeModalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  employeeModalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ECF0F1',
  },
  cancelButtonText: {
    color: '#7F8C8D',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmButton: {
    backgroundColor: '#4ECDC4',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});