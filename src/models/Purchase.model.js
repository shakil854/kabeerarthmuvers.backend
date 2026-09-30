import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.config.js';
import Supplier from './Supplier.model.js';
import Vehicle from './Vehicle.model.js';
import Driver from './Driver.model.js';
import Category from './Category.model.js';

export const Purchase = sequelize.define(
  'Purchase',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    srNo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
      set(value) {
        this.setDataValue(
          'srNo',
          typeof value === 'string' && value.trim() ? value.trim() : null
        );
      },
    },
    trip: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
      set(value) {
        this.setDataValue(
          'trip',
          typeof value === 'string' && value.trim() ? value.trim() : null
        );
      },
    },
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Supplier,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'Supplier is required' },
      },
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Category,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    categoryName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
      set(value) {
        this.setDataValue(
          'categoryName',
          typeof value === 'string' && value.trim() ? value.trim() : null
        );
      },
    },
    vehicleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Vehicle,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    vehicleNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
      set(value) {
        this.setDataValue(
          'vehicleNumber',
          typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : null
        );
      },
    },
    driverId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Driver,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    driverName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
      set(value) {
        this.setDataValue(
          'driverName',
          typeof value === 'string' && value.trim() ? value.trim() : null
        );
      },
    },
    paymentMode: {
      type: DataTypes.ENUM('Online', 'Cash'),
      allowNull: false,
      defaultValue: 'Cash',
      validate: {
        isIn: {
          args: [['Online', 'Cash']],
          msg: 'Payment mode must be either Online or Cash',
        },
      },
    },
    quantity: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        notNull: { msg: 'Quantity is required' },
        isDecimal: { msg: 'Quantity must be a valid number' },
        min: {
          args: [0.01],
          msg: 'Quantity must be greater than 0',
        },
      },
    },
    unit: {
      type: DataTypes.ENUM('Ton', 'Pcs'),
      allowNull: false,
      defaultValue: 'Ton',
      validate: {
        isIn: {
          args: [['Ton', 'Pcs']],
          msg: 'Unit must be either Ton or Pcs',
        },
      },
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        notNull: { msg: 'Price is required' },
        isDecimal: { msg: 'Price must be a valid number' },
        min: {
          args: [0],
          msg: 'Price cannot be negative',
        },
      },
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      set(value) {
        this.setDataValue(
          'note',
          typeof value === 'string' && value.trim() ? value.trim() : null
        );
      },
    },
    purchaseDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    paymentStatus: {
      type: DataTypes.ENUM('Pending', 'Paid'),
      allowNull: false,
      defaultValue: 'Pending',
      validate: {
        isIn: {
          args: [['Pending', 'Paid']],
          msg: 'Payment status must be either Pending or Paid',
        },
      },
    },
    paymentDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: 'purchases',
    timestamps: true,
    hooks: {
      beforeSave: (purchase) => {
        const qty = parseFloat(purchase.quantity) || 0;
        const prc = parseFloat(purchase.price) || 0;
        purchase.totalAmount = parseFloat((qty * prc).toFixed(2));
      },
    },
  }
);

// Define associations
Purchase.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });
Supplier.hasMany(Purchase, { foreignKey: 'supplierId', as: 'purchases' });

Purchase.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Category.hasMany(Purchase, { foreignKey: 'categoryId', as: 'purchases' });

Purchase.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });
Vehicle.hasMany(Purchase, { foreignKey: 'vehicleId', as: 'purchases' });

Purchase.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });
Driver.hasMany(Purchase, { foreignKey: 'driverId', as: 'purchases' });

export default Purchase;
