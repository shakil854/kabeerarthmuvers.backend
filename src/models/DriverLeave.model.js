import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.config.js';
import Driver from './Driver.model.js';

export const DriverLeave = sequelize.define(
  'DriverLeave',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    driverId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Driver,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        notNull: { msg: 'Leave date is required' },
      },
    },
    leaveType: {
      type: DataTypes.ENUM('full', 'half'),
      allowNull: false,
      defaultValue: 'full',
      comment: 'full = 1 day, half = 0.5 day',
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    salaryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: 'driver_leaves',
    timestamps: true,
    indexes: [
      {
        fields: ['driverId'],
      },
      {
        fields: ['date'],
      },
      {
        fields: ['driverId', 'date'],
      },
    ],
  }
);

// Associations
Driver.hasMany(DriverLeave, { foreignKey: 'driverId', as: 'leaves' });
DriverLeave.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

export default DriverLeave;
