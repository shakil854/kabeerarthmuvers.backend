import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.config.js';
import Customer from './Customer.model.js';
import Vehicle from './Vehicle.model.js';
import Driver from './Driver.model.js';
import Category from './Category.model.js';

export const Sale = sequelize.define(
  'Sale',
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
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Customer,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
      validate: {
        notNull: { msg: 'Customer is required' },
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
    vehicleType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'Gadi',
      validate: {
        isIn: {
          args: [['Gadi', 'Tractor']],
          msg: 'Vehicle type must be either Gadi or Tractor',
        },
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
    quantity: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: null,
      validate: {
        isValidQuantity(val) {
          if (val !== null && val !== undefined && val !== '') {
            const num = parseFloat(val);
            if (isNaN(num) || num <= 0) {
              throw new Error('Quantity must be greater than 0 if provided');
            }
          }
        },
      },
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'Ton',
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
    loadingCharge: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    rent: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
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
    detail: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      set(value) {
        this.setDataValue(
          'detail',
          typeof value === 'string' && value.trim() ? value.trim() : null
        );
      },
    },
    saleDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'sales',
    timestamps: true,
    hooks: {
      beforeSave: (sale) => {
        const hasQty = sale.quantity !== null && sale.quantity !== undefined && !isNaN(parseFloat(sale.quantity)) && parseFloat(sale.quantity) > 0;
        const qty = hasQty ? parseFloat(sale.quantity) : null;
        const prc = parseFloat(sale.price) || 0;
        const base = qty !== null ? (qty * prc) : prc;
        const loading = parseFloat(sale.loadingCharge) || 0;
        const rent = parseFloat(sale.rent) || 0;
        const t = parseInt(sale.trip, 10);
        const tripMultiplier = (!isNaN(t) && t > 0) ? t : 1;
        sale.totalAmount = parseFloat((((base) - loading + rent) * tripMultiplier).toFixed(2));
      },
    },
  }
);

// Define associations
Sale.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Customer.hasMany(Sale, { foreignKey: 'customerId', as: 'sales' });

Sale.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Category.hasMany(Sale, { foreignKey: 'categoryId', as: 'sales' });

Sale.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });
Vehicle.hasMany(Sale, { foreignKey: 'vehicleId', as: 'sales' });

Sale.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });
Driver.hasMany(Sale, { foreignKey: 'driverId', as: 'sales' });

export default Sale;
