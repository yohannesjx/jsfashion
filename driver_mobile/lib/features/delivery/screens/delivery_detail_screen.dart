import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../delivery/models/driver_assignment.dart';
import '../../delivery/services/delivery_service.dart';
import 'proof_of_delivery_screen.dart';

class DeliveryDetailScreen extends StatefulWidget {
  final DriverAssignment assignment;

  const DeliveryDetailScreen({super.key, required this.assignment});

  @override
  State<DeliveryDetailScreen> createState() => _DeliveryDetailScreenState();
}

class _DeliveryDetailScreenState extends State<DeliveryDetailScreen> {
  final DeliveryService _deliveryService = DeliveryService();
  late DriverAssignment _assignment;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _assignment = widget.assignment;
  }

  Future<void> _updateStatus(String status) async {
    setState(() => _isLoading = true);
    try {
      await _deliveryService.updateStatus(_assignment.id, status);
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error updating status: $e')),
        );
      }
    }
  }

  Future<void> _launchMaps() async {
    final query = Uri.encodeComponent(_assignment.deliveryAddress);
    final googleUrl = Uri.parse('https://www.google.com/maps/search/?api=1&query=$query');
    if (await canLaunchUrl(googleUrl)) {
      await launchUrl(googleUrl, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open maps')),
        );
      }
    }
  }

  Future<void> _callCustomer() async {
    final phone = _assignment.deliveryPhone.replaceAll(RegExp(r'[^\d+]'), '');
    final url = Uri.parse('tel:$phone');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Order #${_assignment.orderNumber}'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: ListTile(
                leading: Icon(_getStatusIcon(_assignment.status), color: _getStatusColor(_assignment.status)),
                title: Text(
                  _assignment.status.toUpperCase(),
                  style: TextStyle(
                    color: _getStatusColor(_assignment.status),
                    fontWeight: FontWeight.bold,
                  ),
                ),
                subtitle: Text('Tracking: ${_assignment.trackingNumber}'),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Customer Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _buildInfoRow(Icons.person, _assignment.customerName),
                    const Divider(),
                    _buildInfoRow(Icons.phone, _assignment.deliveryPhone, onTap: _callCustomer),
                    const Divider(),
                    _buildInfoRow(Icons.location_on, _assignment.deliveryAddress, onTap: _launchMaps),
                    if (_assignment.deliveryNotes.isNotEmpty) ...[
                      const Divider(),
                      _buildInfoRow(Icons.note, _assignment.deliveryNotes),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Order Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _buildInfoRow(Icons.confirmation_number, 'Assigned: ${_formatDate(_assignment.assignedAt)}'),
                    const Divider(),
                    _buildInfoRow(Icons.monetization_on, 'Total: ETB ${_assignment.totalAmount}'),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _buildActionButtons(),
    );
  }

  Widget _buildActionButtons() {
    if (_assignment.status == 'completed' || _assignment.status == 'failed') {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4, offset: const Offset(0, -2))],
      ),
      child: SafeArea(
        child: _buildStatusAction(),
      ),
    );
  }

  Widget _buildStatusAction() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    switch (_assignment.status) {
      case 'assigned':
        return ElevatedButton.icon(
          onPressed: () => _updateStatus('picked_up'),
          icon: const Icon(Icons.check_circle_outline),
          label: const Text('MARK AS PICKED UP'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.orange,
            padding: const EdgeInsets.symmetric(vertical: 16),
          ),
        );
      case 'picked_up':
        return ElevatedButton.icon(
          onPressed: () async {
            await _updateStatus('in_progress');
            _launchMaps();
          },
          icon: const Icon(Icons.navigation),
          label: const Text('START DELIVERY & NAVIGATE'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue,
            padding: const EdgeInsets.symmetric(vertical: 16),
          ),
        );
      case 'in_progress':
        return ElevatedButton.icon(
          onPressed: () async {
            final result = await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ProofOfDeliveryScreen(orderId: _assignment.fulfillmentOrderId),
              ),
            );
            if (result == true) {
              Navigator.pop(context, true); 
            }
          },
          icon: const Icon(Icons.assignment_turned_in),
          label: const Text('COMPLETE DELIVERY'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.green,
            padding: const EdgeInsets.symmetric(vertical: 16),
          ),
        );
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildInfoRow(IconData icon, String text, {VoidCallback? onTap}) {
    return InkWell(
      onTap: onTap,
      child: Row(
        children: [
          Icon(icon, color: Colors.grey[600]),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 16,
                color: onTap != null ? Colors.blue : Colors.black87,
                decoration: onTap != null ? TextDecoration.underline : null,
              ),
            ),
          ),
          if (onTap != null)
            const Icon(Icons.chevron_right, color: Colors.grey),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'assigned': return Colors.blue;
      case 'picked_up': return Colors.orange;
      case 'in_progress': return Colors.purple;
      case 'completed': return Colors.green;
      case 'failed': return Colors.red;
      default: return Colors.grey;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'assigned': return Icons.assignment_ind;
      case 'picked_up': return Icons.local_shipping;
      case 'in_progress': return Icons.directions_car;
      case 'completed': return Icons.check_circle;
      case 'failed': return Icons.error;
      default: return Icons.help;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute}';
  }
}
