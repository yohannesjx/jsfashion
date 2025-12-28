import 'package:flutter/material.dart';
import 'package:warehouse_mobile/shared/models/fulfillment_models.dart';
import 'package:warehouse_mobile/shared/services/fulfillment_service.dart';
import 'packing_screen.dart';

class PackingListScreen extends StatefulWidget {
  const PackingListScreen({super.key});

  @override
  State<PackingListScreen> createState() => _PackingListScreenState();
}

class _PackingListScreenState extends State<PackingListScreen> {
  final _service = FulfillmentService();
  late Future<List<FulfillmentOrder>> _tasksFuture;

  @override
  void initState() {
    super.initState();
    _refreshTasks();
  }

  void _refreshTasks() {
    setState(() {
      _tasksFuture = _service.getPendingPacking();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pending Packing'),
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
            return const Center(child: Text('No orders ready for packing'));
          }

          return ListView.builder(
            itemCount: tasks.length,
            itemBuilder: (context, index) {
              final task = tasks[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  title: Text('Order #${task.orderNumber}'),
                  subtitle: Text('${task.itemCount} Items • Needs Packing'),
                  trailing: const Icon(Icons.inventory_2),
                  onTap: () => _startPacking(task),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _startPacking(FulfillmentOrder order) async {
    try {
      await _service.startPacking(order.id);
      if (!mounted) return;
      
      final result = await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => PackingScreen(order: order),
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
