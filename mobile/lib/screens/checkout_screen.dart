import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http_parser/http_parser.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/cart_model.dart';
import '../constants.dart';
import 'thank_you_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _addressController = TextEditingController();
  final _couponController = TextEditingController();
  
  String _selectedDelivery = 'free'; // 'free' or 'outside'
  String? _copiedAccount;
  File? _uploadedFile;
  String? _uploadError;
  bool _highlightUpload = false;
  bool _isLoading = false;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    // Load saved details after the first frame to ensure plugin is ready
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadSavedDetails();
    });
  }

  Future<void> _loadSavedDetails() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (mounted) {
        setState(() {
          _nameController.text = prefs.getString('checkout_name') ?? '';
          _phoneController.text = prefs.getString('checkout_phone') ?? '';
          _addressController.text = prefs.getString('checkout_address') ?? '';
        });
      }
    } catch (e) {
      // Silently fail if preferences aren't available
      print('Failed to load saved details: $e');
    }
  }

  Future<void> _saveDetails() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('checkout_name', _nameController.text);
      await prefs.setString('checkout_phone', _phoneController.text);
      await prefs.setString('checkout_address', _addressController.text);
    } catch (e) {
      // Silently fail if preferences aren't available
      print('Failed to save details: $e');
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    _couponController.dispose();
    super.dispose();
  }

  double _calculateDeliveryFee(double subtotal) {
    if (_selectedDelivery == 'outside') {
      return 800;
    }
    return subtotal >= 5000 ? 0 : 300;
  }

  Future<void> _handleCopy(String text, String accountType) async {
    await Clipboard.setData(ClipboardData(text: text));
    setState(() => _copiedAccount = accountType);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copiedAccount = null);
    });
  }

  Future<void> _handleFileSelect() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );
      
      if (image != null) {
        final file = File(image.path);
        final fileSize = await file.length();
        
        // Validate file size (10MB)
        if (fileSize > 10 * 1024 * 1024) {
          setState(() {
            _uploadError = 'File size must be less than 10MB';
            _uploadedFile = null;
          });
          return;
        }
        
        setState(() {
          _uploadedFile = file;
          _uploadError = null;
        });
      }
    } catch (e) {
      setState(() {
        _uploadError = 'Failed to select image';
        _uploadedFile = null;
      });
    }
  }

  void _handleRemoveFile() {
    setState(() {
      _uploadedFile = null;
      _uploadError = null;
    });
  }

  void _placeOrder() {
    if (!_formKey.currentState!.validate()) return;
    _showCheckoutDialog();
  }

  void _showCheckoutDialog() {
    final cart = Provider.of<CartModel>(context, listen: false);
    final deliveryFee = _calculateDeliveryFee(cart.totalAmount);
    final total = cart.totalAmount + deliveryFee;
    final formatter = NumberFormat("#,##0", "en_US");

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          Future<void> pickImage() async {
            try {
              final XFile? image = await _picker.pickImage(
                source: ImageSource.gallery,
                maxWidth: 1920,
                maxHeight: 1920,
                imageQuality: 85,
              );
              
              if (image != null) {
                final file = File(image.path);
                final size = await file.length();
                
                if (size > 10 * 1024 * 1024) {
                  setModalState(() {
                    _uploadError = 'File size must be less than 10MB';
                    _uploadedFile = null;
                  });
                  return;
                }
                
                setModalState(() {
                  _uploadedFile = file;
                  _uploadError = null;
                });
              }
            } catch (e) {
              setModalState(() {
                _uploadError = 'Failed to select image';
                _uploadedFile = null;
              });
            }
          }

          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              left: 20,
              right: 20,
              top: 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Complete Your Order',
                      style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue[50],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.blue[200]!),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.info_outline, color: Colors.blue[700], size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Your order will be delivered same day or next day. We will contact you as soon as you place the order.',
                          style: GoogleFonts.inter(color: Colors.blue[800], fontSize: 13, height: 1.4),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Total Amount:', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600)),
                    Text('${formatter.format(total)} ETB', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 24),
                
                Text(
                  'Upload Payment Screenshot *',
                  style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                
                GestureDetector(
                  onTap: pickImage,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: _uploadedFile != null ? Colors.green : Colors.grey[300]!,
                        width: 2,
                      ),
                      borderRadius: BorderRadius.circular(8),
                      color: _uploadedFile != null ? Colors.green[50] : Colors.white,
                    ),
                    child: _uploadedFile == null
                        ? Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.upload, size: 20, color: Colors.grey[600]),
                              const SizedBox(width: 8),
                              Text(
                                'Click to upload',
                                style: GoogleFonts.inter(color: Colors.grey[700], fontWeight: FontWeight.w500),
                              ),
                            ],
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.check_circle, color: Colors.green[600], size: 20),
                              const SizedBox(width: 8),
                              Text(
                                'Screenshot Uploaded',
                                style: GoogleFonts.inter(color: Colors.green[800], fontWeight: FontWeight.w500),
                              ),
                            ],
                          ),
                  ),
                ),
                if (_uploadError != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      _uploadError!,
                      style: GoogleFonts.inter(color: Colors.red, fontSize: 12),
                      textAlign: TextAlign.center,
                    ),
                  ),
                
                const SizedBox(height: 24),
                
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _uploadedFile != null
                        ? () {
                            Navigator.pop(context);
                            _submitOrder();
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      disabledBackgroundColor: Colors.grey[300],
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      elevation: 0,
                    ),
                    child: Text(
                      'Confirm Order',
                      style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _submitOrder() async {
    setState(() => _isLoading = true);
    final cart = Provider.of<CartModel>(context, listen: false);

    try {
      final items = cart.items.map((item) => {
        'variant_id': item.variantId.toString(),
        'quantity': item.quantity,
      }).toList();

      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${ApiConstants.baseUrl}/orders'),
      );

      request.fields['data'] = json.encode({
        'customer_id': null,
        'items': items,
        'payment_method': 'bank_transfer',
        'shipping_address': {
          'full_name': _nameController.text,
          'phone': _phoneController.text,
          'email': null,
          'address': _addressController.text,
          'city': _addressController.text,
          'delivery_method': _selectedDelivery,
        },
      });

      if (_uploadedFile != null) {
        final fileName = _uploadedFile!.path.split('/').last;
        final extension = fileName.split('.').last.toLowerCase();
        
        // Determine MIME type based on file extension
        MediaType contentType;
        if (extension == 'jpg' || extension == 'jpeg') {
          contentType = MediaType('image', 'jpeg');
        } else if (extension == 'png') {
          contentType = MediaType('image', 'png');
        } else if (extension == 'heic') {
          contentType = MediaType('image', 'heic');
        } else {
          contentType = MediaType('image', 'jpeg'); // Default fallback
        }
        
        request.files.add(
          await http.MultipartFile.fromPath(
            'payment_screenshot',
            _uploadedFile!.path,
            contentType: contentType,
          ),
        );
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final result = json.decode(response.body);
        final orderNumber = result['order']?['order_number'] ?? result['order_number'];
        
        // Save user details for next time
        await _saveDetails();
        
        cart.clear();
        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => ThankYouScreen(orderNumber: orderNumber?.toString() ?? 'N/A'),
            ),
          );
        }
      } else {
        final errorData = json.decode(response.body);
        throw Exception(errorData['error'] ?? 'Failed to create order');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create order: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String placeholder,
    TextInputType? keyboardType,
    bool required = false,
    int? maxLength,
    TextCapitalization textCapitalization = TextCapitalization.sentences,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      textCapitalization: textCapitalization,
      maxLength: maxLength,
      style: GoogleFonts.inter(fontSize: 14), // Smaller font for slim look
      decoration: InputDecoration(
        hintText: placeholder,
        hintStyle: GoogleFonts.inter(fontSize: 14, color: Colors.grey[400]),
        filled: true,
        fillColor: Colors.white,
        isDense: true, // Reduces height
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10), // Adjusted for ~40px height
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: Colors.grey[300]!),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: Colors.grey[300]!),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Colors.black),
        ),
        counterText: '',
      ),
      validator: required ? (v) => v?.isNotEmpty == true ? null : 'Required' : null,
    );
  }

  @override
  Widget build(BuildContext context) {
    final cart = Provider.of<CartModel>(context);
    final formatter = NumberFormat("#,##0", "en_US");
    final subtotal = cart.totalAmount;
    final deliveryFee = _calculateDeliveryFee(subtotal);
    final total = subtotal + deliveryFee;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(
          'Checkout',
          style: GoogleFonts.inter(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.black,
          ),
        ),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent, // Fixes grey tint on scroll
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black),
      ),
      body: SingleChildScrollView(
        physics: const NeverScrollableScrollPhysics(), // Disable scrolling
        padding: const EdgeInsets.all(16),
        child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Contact Information
                  Row(
                    children: [
                      Expanded(
                        child: _buildTextField(
                          controller: _nameController,
                          placeholder: 'Full Name',
                          required: true,
                          textCapitalization: TextCapitalization.none,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: TextFormField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          maxLength: 10,
                          style: GoogleFonts.inter(fontSize: 14),
                          decoration: InputDecoration(
                            hintText: '9XXXXXXXX',
                            hintStyle: GoogleFonts.inter(fontSize: 14, color: Colors.grey[400]),
                            filled: true,
                            fillColor: Colors.white,
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: BorderSide(color: Colors.grey[300]!),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: BorderSide(color: Colors.grey[300]!),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: Colors.black),
                            ),
                            prefixIcon: Padding(
                              padding: const EdgeInsets.only(left: 12, right: 8),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    '+251',
                                    style: GoogleFonts.inter(
                                      color: Colors.grey[600],
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
                            counterText: '',
                          ),
                          validator: (v) => v?.isNotEmpty == true ? null : 'Required',
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Delivery Address
                  Text(
                    'Delivery Address *',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  _buildTextField(
                    controller: _addressController,
                    placeholder: 'Street Address or City',
                    required: true,
                    textCapitalization: TextCapitalization.none,
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Delivery Method
                  Text(
                    'Delivery Method',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  
                  // Inside Addis Option
                  GestureDetector(
                    onTap: () => setState(() => _selectedDelivery = 'free'),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: _selectedDelivery == 'free' ? Colors.black : Colors.grey[300]!,
                          width: 2,
                        ),
                        borderRadius: BorderRadius.circular(8),
                        color: _selectedDelivery == 'free' ? Colors.grey[50] : Colors.white,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: _selectedDelivery == 'free' ? Colors.black : Colors.grey[300]!,
                                width: 2,
                              ),
                            ),
                            child: _selectedDelivery == 'free'
                                ? Center(
                                    child: Container(
                                      width: 12,
                                      height: 12,
                                      decoration: const BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: Colors.black,
                                      ),
                                    ),
                                  )
                                : null,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Inside Addis Ababa',
                              style: GoogleFonts.inter(fontWeight: FontWeight.w500),
                            ),
                          ),
                          Text(
                            subtotal >= 5000 ? 'Free' : '300 ETB',
                            style: GoogleFonts.inter(
                              fontWeight: FontWeight.bold,
                              color: subtotal >= 5000 ? Colors.green : Colors.black,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  
                  // Outside Addis Option
                  GestureDetector(
                    onTap: () => setState(() => _selectedDelivery = 'outside'),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: _selectedDelivery == 'outside' ? Colors.black : Colors.grey[300]!,
                          width: 2,
                        ),
                        borderRadius: BorderRadius.circular(8),
                        color: _selectedDelivery == 'outside' ? Colors.grey[50] : Colors.white,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: _selectedDelivery == 'outside' ? Colors.black : Colors.grey[300]!,
                                width: 2,
                              ),
                            ),
                            child: _selectedDelivery == 'outside'
                                ? Center(
                                    child: Container(
                                      width: 12,
                                      height: 12,
                                      decoration: const BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: Colors.black,
                                      ),
                                    ),
                                  )
                                : null,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Outside Addis Ababa',
                              style: GoogleFonts.inter(fontWeight: FontWeight.w500),
                            ),
                          ),
                          Text(
                            '800 ETB',
                            style: GoogleFonts.inter(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Coupon
                  Text(
                    'Have a Coupon?',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: 40,
                          child: TextFormField(
                            controller: _couponController,
                            textCapitalization: TextCapitalization.characters,
                            decoration: InputDecoration(
                              hintText: 'Enter coupon code',
                              filled: true,
                              fillColor: Colors.white,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(color: Colors.grey[300]!),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(color: Colors.grey[300]!),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(color: Colors.black),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        height: 40,
                        child: OutlinedButton(
                          onPressed: () {
                            // TODO: Implement coupon logic
                          },
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: Colors.grey[300]!),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: Text(
                            'Apply',
                            style: GoogleFonts.inter(color: Colors.black, fontSize: 13),
                          ),
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Payment Information
                  Text(
                    'Make Payment',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  
                  // CBE Account
                  _buildPaymentAccount(
                    'CBE',
                    '1000484381047',
                    'Betelhem Aklilu',
                    'cbe',
                  ),
                  const SizedBox(height: 12),
                  
                  // TeleBirr Account
                  _buildPaymentAccount(
                    'TeleBirr',
                    '0984666187',
                    'Betelhem',
                    'telebirr',
                  ),
                  const SizedBox(height: 12),
                  
                  // BOA Account
                  _buildPaymentAccount(
                    'BOA',
                    '170930177',
                    'Betelhem Aklilu',
                    'boa',
                  ),
                  
                ],
              ),
            ),
          ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Colors.grey[200]!)),
        ),
        child: SafeArea(
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _placeOrder,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.black,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : Text(
                      'Place Order',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentAccount(String bank, String account, String name, String accountType) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey[200]!, width: 1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        children: [
          Expanded(
            child: Row(
              children: [
                Text(
                  '$bank ',
                  style: GoogleFonts.inter(
                    color: Colors.black, 
                    fontSize: 13,
                    fontWeight: FontWeight.w500
                  ),
                ),
                Expanded(
                  child: Text(
                    '$account | $name',
                    style: GoogleFonts.inter(
                      color: Colors.black, 
                      fontSize: 13,
                      fontWeight: FontWeight.bold
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          SizedBox(
            height: 24,
            child: OutlinedButton(
              onPressed: () => _handleCopy(account, accountType),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: Colors.grey[300]!),
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    _copiedAccount == accountType ? Icons.check : Icons.copy,
                    size: 12,
                    color: _copiedAccount == accountType ? Colors.green : Colors.black,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Copy',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      color: Colors.black,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
