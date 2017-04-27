//@flow

import React, {
  PropTypes,
  Component
} from 'react';
import {
  RefreshControl,
} from 'react-native';
import ZKUtils from 'zhike-mobile-utils';
import ZKListView from './ZKListView';

export default class PagedListView extends Component {
  state: { refreshing: bool, hasMore:bool }
  _onScroll: (e:any) => void
  _onPullDown: (e:any) => void
  _loadNextPage: () => Promise<any>

  constructor(props:any) {
    super(props);
    this.state = {
      refreshing: false,
      hasMore: {}.hasOwnProperty.call(props, 'hasMore') ? !!props.hasMore : true
    };
    this._onScroll = this._onScroll.bind(this);
    this._onPullDown = this._onPullDown.bind(this);
    this._loadNextPage = this._loadNextPage.bind(this);
  }

  componentDidMount() {
    if (!this.props.items || !this.props.items.length) {
      this.setState({ refreshing:true });
      this._loadNextPage()
      .catch((err) => {
        console.warn('failed to call _loadNextPage, error: ', err);
      })
      .then(() => {
        this.setState({ refreshing:false });
      });
    }
  }

  _onScroll(e) {
    this.props && this.props.onScroll && this.props.onScroll(e);
  }

  _onPullDown(e) {
    this.setState({ refreshing:true });
    this.props.fetchItems(0, this.props.pageSize * this._numberOfPages())
    .catch((err) => {
      console.error('failed to call fetchItems, error: ', err);
      return null;
    })
    .then((res) => {
      this.setState({
        refreshing:false,
        hasMore: Array.isArray(res) && res.length >= this.props.pageSize,
      });
    });
  }

  _loadNextPage() {
    return this.props.fetchItems(this._nextPage(), this.props.pageSize)// index starts from 1
    .catch(err => console.warn('error fetchItems: ', err))
    .then(res => this.setState({
      hasMore: Array.isArray(res) && res.length >= this.props.pageSize,
    }));
  }

  _nextPage() {
    return Math.floor(this.props.items.length / this.props.pageSize) + 1;
  }

  _numberOfPages() {
    return Math.floor((this.props.items.length + this.props.pageSize - 1) / this.props.pageSize);
  }

  render() {
    let { items, fetchItems, onScroll, style, separatorStyle, ...other } = this.props;
    other = other || {};
    return (
      <ZKListView
        onScroll={this._onScroll}
        style={[{ backgroundColor:'#f5f5f5' }, style]}
        dataSource={this.props.genDataSource(this.props.items)}
        separatorStyle={[{ backgroundColor: '#e6e6e6' }, separatorStyle]}
        refreshControl={
          <RefreshControl
            refreshing={!!this.state.refreshing}
            onRefresh={this._onPullDown}
            tintColor="#00B5E9"
            title="正在加载中..."
            progressBackgroundColor="#ffff00"
          />
        }
        hasMore={this.state.hasMore}
        paging={true}
        onFetchNextPage={this._loadNextPage}
        {...other}
      />
    );
  }
}

PagedListView.propTypes = {
  ...ZKListView.propTypes,
  items: PropTypes.arrayOf(PropTypes.object),
  fetchItems: PropTypes.func.isRequired,// (page, pageSize) => Promise<{items, totalPage}>
  pageSize: PropTypes.number,
  genDataSource: PropTypes.func.isRequired,
};

PagedListView.defaultProps = {
  pageSize: 10,
};
