import 'package:flutter/material.dart';
import 'package:warehouse_mobile/shared/models/fulfillment_models.dart';
import 'package:warehouse_mobile/shared/services/fulfillment_service.dart';
import 'picking_screen.dart';

class PickingListScreen extends StatefulWidget {
  const PickingListScreen({super.key});

  @override
  State<PickingListScreen> createState() => _PickingListScreenState();
}

class _PickingListScreenState extends State<PickingListScreen> {
  final _service = FulfillmentService();
  late Future<List<FulfillmentOrder>> _tasksFuture;

  @override
  void initState() {
    super.initState();
    _refreshTasks();
  }

  void _refreshTasks() {
    setState(() {
      _tasksFuture = _service.getPendingPicking();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('New Orders to Pick'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshTasks,
          ),
        ],
      ),
      body: FutureBuilder<List<FulfillmentOrder>>(
        future: _tasksFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }

          final tasks = snapshot.data ?? [];
          if (tasks.isEmpty) {
            return const Center(child: Text('No pending orders'));
          }

          return ListView.builder(
            itemCount: tasks.length,
            itemBuilder: (context, index) {
              final task = tasks[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  title: Text('Order #${task.orderNumber}'),
                  subtitle: Text('${task.itemCount} Items • ${task.customerName}'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () => _startPicking(task),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _startPicking(FulfillmentOrder order) async {
    try {
      await _service.startPicking(order.id);
      if (!mounted) return;
      
      final result = await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => PickingScreen(order: order),
        ),
      );

      if (result == true) {
        _refreshTasks();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }
}
