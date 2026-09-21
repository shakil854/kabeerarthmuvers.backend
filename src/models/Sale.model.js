import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.config.js';
import Customer from './Customer.model.js';

export const Sale = sequelize.define(
  'Sale',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
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
        const qty = parseFloat(sale.quantity) || 0;
        const prc = parseFloat(sale.price) || 0;
        sale.totalAmount = parseFloat((qty * prc).toFixed(2));
      },
    },
  }
);

// Define associations
Sale.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Customer.hasMany(Sale, { foreignKey: 'customerId', as: 'sales' });

export default Sale;
